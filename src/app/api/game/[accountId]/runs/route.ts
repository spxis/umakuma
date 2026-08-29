import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
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
  type GameDirection,
  isGameTimeLimitMs,
} from "@/lib/gameMode";
import { hydrateGameQuestions, toGameRunSummary } from "@/lib/gameModeServer";
import {
  findResumableDailyRun,
  GameRunConflictError,
  persistGameRun,
  planGameRun,
  type GameRunRequest,
} from "@/lib/gameRunCreate";

const bodySchema = z.object({
  kind: z.string().refine(isGameKind).default(GAME_KINDS.match),
  batchSize: z.union([z.literal("all"), z.number().int().refine(isGameBatchSize)]).default("all"),
  level: z.number().int().min(1).max(60).nullable().default(null),
  category: z.string().refine(isGameCategory),
  hardMode: z.boolean().default(false),
  choiceCount: z.number().int().refine(isGameChoiceCount).optional(),
  direction: z.string().refine(isGameDirection).default("find"),
  answerMode: z.string().refine(isGameAnswerMode).default("auto"),
  ultraMode: z.boolean().default(false),
  timeLimitMs: z.number().int().refine(isGameTimeLimitMs).nullable().default(null),
})
  .refine((body) => !body.ultraMode || body.level !== null, {
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

        const rules = gameKindRules(parsed.data.kind);
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
          direction: rules.fixedCategory === "vocabulary" || rules.oncePerDay ? "find" : parsed.data.direction,
          answerMode: rules.oncePerDay ? "auto" : parsed.data.answerMode,
          ultraMode: rules.usesUltraMode ? parsed.data.ultraMode : false,
          timeLimitMs: rules.usesTimeLimit ? parsed.data.timeLimitMs : null,
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
