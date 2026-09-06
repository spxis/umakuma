import { NextResponse } from "next/server";
import { z } from "zod";

import { pendingGate, startLevelTest } from "@/lib/uk/unLevelTestServer";
import { canAccessAccount } from "@/lib/accountAccess";
import { isAuthorizedAdmin } from "@/lib/admin";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import {
  GAME_KINDS,
  gameChoiceCountFrom,
  gameKindRules,
  isGameBatchSize,
  isGameCategory,
  isGameAnswerMode,
  isGameChoiceCount,
  isGameDirection,
  isGameKind,
  isGamePracticeList,
  GAME_PRACTICE_LISTS,
  resolveGameAnswerMode,
  type GameDirection,
  isGameTimeLimitMs, type PlayableGameKind,
} from "@/lib/gameMode";
import { hydrateGameQuestions, toGameRunSummary } from "@/lib/gameModeServer";
import { isAdminOnlyMapCountry, isPlayableMapCountry } from "@/lib/mapCountries";
import {
  findResumableDailyRun,
  GameRunConflictError,
  persistGameRun,
  planGameRun,
  type GameRunRequest,
} from "@/lib/gameRunCreate";
import { GAME_LADDERS } from "@/lib/gameRunCreate";

const bodySchema = z.object({
  kind: z.string().refine((value) => isGameKind(value) || value === GAME_KINDS.levelTest).default(GAME_KINDS.match),
  batchSize: z.union([z.literal("all"), z.number().int().refine(isGameBatchSize)]).default("all"),
  level: z.number().int().min(1).max(60).nullable().default(null),
  category: z.string().refine(isGameCategory),
  hardMode: z.boolean().default(false),
  choiceCount: z.number().int().refine(isGameChoiceCount).optional(),
  direction: z.string().refine(isGameDirection).default("find"),
  answerMode: z.string().refine(isGameAnswerMode).default("auto"),
  practiceList: z.string().refine(isGamePracticeList).default(GAME_PRACTICE_LISTS.trouble),
  ultraMode: z.boolean().default(false),
  timeLimitMs: z.number().int().refine(isGameTimeLimitMs).nullable().default(null),
  /*
   * Map mode only; Japan when unspecified, which is every older client.
   *
   * Asked of the country registry rather than spelled out here. The literal
   * list said JP, US, CA long after the lobby had started offering four pilot
   * countries, so an admin who picked Thailand got "Could not start the game"
   * and no way to tell why - the same shape of failure the refine below this
   * object exists to prevent.
   */
  /*
   * Playable, not merely real. Thirty countries have maps and three have the
   * reserved subject-id ranges a run is stored with, so parsing "is this a
   * country" would let a request start a run on France whose questions point
   * at nothing.
   */
  mapCountry: z.string().refine(isPlayableMapCountry).optional(),
  /* Our hundred levels, or WaniKani's sixty. */
  ladder: z.enum([GAME_LADDERS.wanikani, GAME_LADDERS.umakuma]).optional(),
})
  // Only the games that offer Ultra have to satisfy it. A stale `ultraMode` from
  // a previous Match round would otherwise reject a Map or Practice start
  // outright, which the player sees as "Could not start the game".
  .refine((body) => !gameKindRules(body.kind).usesUltraMode || !body.ultraMode || body.level !== null, {
    message: "Ultra Mode requires a level.",
    path: ["level"],
  })
  .refine((body) => !gameKindRules(body.kind).usesTimeLimit || body.timeLimitMs !== null, {
    message: "This game requires a time limit.",
    path: ["timeLimitMs"],
  });

export async function POST(request: Request, context: { params: Promise<{ accountId: string }> }) {
  return withApiRouteTelemetry({
    route: "/api/game/[accountId]/runs",
    method: "POST",
    request,
    execute: async () => {
      try {
        const json = await request.json();
        const parsed = bodySchema.safeParse(json);
        if (!parsed.success) {
          return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
        }

        const { accountId } = await context.params;
        if (!(await canAccessAccount(request, accountId))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        /*
         * A pilot country is admin-only, and this is where that is enforced.
         * The lobby hides them from everyone else, but hiding a choice is not
         * refusing it - the country arrives in the request body, so the answer
         * has to be given again on the server.
         */
        const country = parsed.data.mapCountry;
        if (country && isAdminOnlyMapCountry(country) && !(await isAuthorizedAdmin(request))) {
          return NextResponse.json({ error: "That map is not available." }, { status: 403 });
        }

        /* A level test is started like any game so the runner can play it,
           but nothing in the body says what is tested: the gate is the one
           the member's standing has reached, derived here and nowhere else. */
        if (parsed.data.kind === GAME_KINDS.levelTest) {
          const gate = await pendingGate(accountId);
          if (!gate) return NextResponse.json({ error: "No test is waiting." }, { status: 409 });
          const { run } = await startLevelTest(accountId, gate);
          const questions = await hydrateGameQuestions(run.questions, run.direction as GameDirection);
          return NextResponse.json({ run: toGameRunSummary(run), questions }, { status: 201 });
        }

        const rules = gameKindRules(parsed.data.kind as PlayableGameKind);
        const gameRequest: GameRunRequest = {
          kind: parsed.data.kind,
          batchSize: parsed.data.batchSize,
          level: rules.usesLevel ? parsed.data.level : null,
          category: rules.fixedCategory ?? parsed.data.category,
          // Older clients send only hardMode; treat that as three choices.
          choiceCount: rules.usesHardMode
            ? gameChoiceCountFrom(parsed.data.choiceCount, parsed.data.hardMode)
            : 2,
          // Daily and Shiritori define their own presentation.
          direction: rules.usesDirection ? parsed.data.direction : "find",
          answerMode: rules.usesAnswerMode
            ? resolveGameAnswerMode(parsed.data.kind, parsed.data.answerMode)
            : "auto",
          // Only Practice drills one of the player's lists; every other game
          // takes its targets from the pool the setup already narrowed.
          practiceList: rules.usesPracticeList ? parsed.data.practiceList : GAME_PRACTICE_LISTS.toughest,
          ultraMode: rules.usesUltraMode ? parsed.data.ultraMode : false,
          timeLimitMs: rules.usesTimeLimit ? parsed.data.timeLimitMs : null,
          // Ignored by every game but Map, where it chooses the country.
          mapCountry: parsed.data.mapCountry,
          ladder: parsed.data.ladder,
        };

        if (rules.oncePerDay) {
          const resumable = await findResumableDailyRun(accountId);
          if (resumable) {
            return NextResponse.json({
              run: toGameRunSummary(resumable),
              questions: await hydrateGameQuestions(resumable.questions, resumable.direction as GameDirection),
              resumed: true,
            }, { status: 200 });
          }
        }

        const plan = await planGameRun(accountId, gameRequest);
        const run = await persistGameRun(accountId, gameRequest, plan);
        const questions = await hydrateGameQuestions(run.questions, run.direction as GameDirection);

        return NextResponse.json({ run: toGameRunSummary(run), questions }, { status: 201 });
      } catch (error) {
        if (error instanceof GameRunConflictError) {
          return NextResponse.json({ error: error.message }, { status: 409 });
        }
        const message = error instanceof Error ? error.message : "Could not start the game.";
        const status = message.includes("eligible") || message.includes("distinct") || message.includes("available") ? 422 : 500;
        if (status === 500) console.error("Failed to start game", error);
        return NextResponse.json({ error: status === 422 ? message : "Could not start the game." }, { status });
      }
    },
  });
}
