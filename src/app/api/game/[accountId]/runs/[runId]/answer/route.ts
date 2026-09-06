import { GAME_KINDS } from "@/lib/gameMode";
import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import {
  gameAnswerProgress,
  gameChoiceCountFrom,
  gameProgressFlags,
  gameRunIsExpired,
  isUltraGameBatchSize,
  type GameCategory,
  type GameAnswerMode,
  type GameDirection,
  type GameKind,
} from "@/lib/gameMode";
import { accumulateItemScore } from "@/lib/gameScoring";
import { completedRunValues, hydrateGameQuestions, toGameRunSummary } from "@/lib/gameModeServer";
import { buildAppendedQuestions } from "@/lib/gameRunAppend";
import { prisma } from "@/lib/prisma";
import { settleDailyXp } from "@/lib/xp/xpDayServer";
import { finalizeLevelTestForRun } from "@/lib/uk/unLevelTestServer";
import { awardXpQuietly } from "@/lib/xp/xpServer";
import type { XpEarned } from "@/lib/xp/xpToast";
import { XP_REASONS } from "@/lib/xp/xpStudyAwards";
import { gameXpAwards } from "@/lib/xp/xpStudyAwards";

const bodySchema = z.object({
  questionId: z.string().min(1),
  selectedSubjectId: z.number().int().positive(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ accountId: string; runId: string }> },
) {
  return withApiRouteTelemetry({
    route: "/api/game/[accountId]/runs/[runId]/answer",
    method: "POST",
    request,
    execute: async () => {
      try {
        const parsed = bodySchema.safeParse(await request.json());
        if (!parsed.success) {
          return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
        }
        const { accountId, runId } = await context.params;
        if (!(await canAccessAccount(request, accountId))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const pendingQuestion = await prisma.gameQuestion.findUnique({
          where: { id: parsed.data.questionId },
          include: { run: true },
        });
        if (!pendingQuestion || pendingQuestion.runId !== runId || pendingQuestion.run.accountId !== accountId) {
          throw new Error("Game question not found.");
        }

        const pendingRun = pendingQuestion.run;
        const pendingKind = pendingRun.kind as GameKind;
        const pendingFlags = gameProgressFlags(pendingKind, isUltraGameBatchSize(pendingRun.batchSize));
        const pendingExpired = gameRunIsExpired(
          pendingKind,
          pendingRun.timeLimitMs,
          Date.now() - pendingRun.startedAt.getTime(),
        );
        const pendingCorrect = parsed.data.selectedSubjectId === pendingQuestion.targetSubjectId;
        // Built outside the transaction so pool queries never hold a write lock.
        const shouldAppend =
          pendingFlags.endless &&
          !pendingExpired &&
          (!pendingFlags.endsOnWrong || pendingCorrect) &&
          pendingQuestion.position + 1 >= pendingRun.questionCount;
        const appendedInputs = shouldAppend
          ? await buildAppendedQuestions(
              {
                id: pendingRun.id,
                accountId,
                kind: pendingKind,
                batchSize: pendingRun.batchSize,
                level: pendingRun.level,
                category: pendingRun.category as GameCategory,
                choiceCount: gameChoiceCountFrom(pendingRun.choiceCount, pendingRun.hardMode),
                direction: pendingRun.direction as GameDirection,
                answerMode: pendingRun.answerMode as GameAnswerMode,
                questionCount: pendingRun.questionCount,
              },
              pendingQuestion.targetSubjectId,
            )
          : [];

        const earned: XpEarned = [];
        const outcome = await prisma.$transaction(async (tx) => {
          const question = await tx.gameQuestion.findUnique({
            where: { id: parsed.data.questionId },
            include: { run: true },
          });
          if (!question || question.runId !== runId || question.run.accountId !== accountId) {
            throw new Error("Game question not found.");
          }
          if (question.run.status !== "active") throw new Error("This game is already complete.");
          if (question.position !== question.run.answeredCount) throw new Error("Answer the current question first.");
          const validChoices = question.optionSubjectIds.length > 0
            ? question.optionSubjectIds
            : [question.leftSubjectId, question.middleSubjectId, question.rightSubjectId];
          if (!validChoices.includes(parsed.data.selectedSubjectId)) {
            throw new Error("Invalid answer choice.");
          }

          const kind = question.run.kind as GameKind;
          const expired = gameRunIsExpired(
            kind,
            question.run.timeLimitMs,
            Date.now() - question.run.startedAt.getTime(),
          );
          // Read the previous answer time before claiming this one, so the gap
          // between answers is what the speed bonus is measured against.
          const previousAnswer = await tx.gameQuestion.findFirst({
            where: { runId, answeredAt: { not: null } },
            orderBy: { answeredAt: "desc" },
            select: { answeredAt: true },
          });
          const responseMs = Date.now() - (previousAnswer?.answeredAt ?? question.run.startedAt).getTime();

          const correct = !expired && parsed.data.selectedSubjectId === question.targetSubjectId;
          const claimed = await tx.gameQuestion.updateMany({
            where: { id: question.id, correct: null },
            data: { selectedSubjectId: parsed.data.selectedSubjectId, correct, answeredAt: new Date() },
          });
          if (claimed.count !== 1) throw new Error("This question was already answered.");

          // An answer that lands after the clock expired closes the run without scoring.
          const answeredCount = question.run.answeredCount + (expired ? 0 : 1);
          const correctCount = question.run.correctCount + (correct ? 1 : 0);
          const currentStreak = correct ? question.run.currentStreak + 1 : 0;
          const bestStreak = Math.max(question.run.bestStreak, currentStreak);
          const flags = gameProgressFlags(kind, isUltraGameBatchSize(question.run.batchSize));
          // Timed games score as they go, per answer, rather than at the end.
          const runningScore = question.run.timeLimitMs !== null && !expired
            ? accumulateItemScore(question.run.score, correct, responseMs)
            : question.run.score;
          const progress = gameAnswerProgress({
            endless: flags.endless,
            endsOnWrong: flags.endsOnWrong,
            expired,
            correct,
            answeredCount,
            questionCount: question.run.questionCount,
            appendedQuestionCount: appendedInputs.length,
          });
          if (progress.appendCycle) {
            await tx.gameQuestion.createMany({ data: appendedInputs.map((nextQuestion) => ({ ...nextQuestion, runId })) });
          }
          const run = await tx.gameRun.update({
            where: { id: runId },
            data: {
              answeredCount,
              correctCount,
              currentStreak,
              bestStreak,
              questionCount: progress.questionCount,
              score: runningScore,
              ...(progress.complete
                ? completedRunValues({
                    kind,
                    startedAt: question.run.startedAt,
                    correctCount,
                    questionCount: progress.questionCount,
                    bestStreak,
                    level: question.run.level,
                    timeLimitMs: question.run.timeLimitMs,
                    accumulatedScore: runningScore,
                  })
                : {}),
            },
          });
          return {
            correct,
            expired,
            run,
            completedNow: progress.complete,
            appendedFromPosition: progress.appendCycle ? question.run.questionCount : null,
          };
        });

        /* A fixed-length game never reaches the complete route - it ends on
           the answer that finishes it - so the award has to be taken here as
           well, or only the timed games would ever pay. Quiet either way: a
           game that scored and could not bank its XP is still a finished
           game. */
        if (outcome.completedNow && pendingKind === GAME_KINDS.levelTest) {
          /* A test is not a game: its finish is a verdict on the gate, and it
             pays the test's own XP inside that, never the game's. */
          const finished = await finalizeLevelTestForRun(accountId, runId);
          earned.push(...(finished?.earned ?? []));
        } else if (outcome.completedNow) {
          /* Kept so the page can say what was earned, one toast per thing:
             finishing the game is a different fact from the day's sign-in. */
          const gameXp = await awardXpQuietly({ accountId, requests: gameXpAwards() });
          /* And what the day has become because of it: the sign-in, a streak
             milestone, the "a lesson and a game" quest. Swallows its own
             failures, like the award above it. */
          const dayXp = await settleDailyXp({ accountId });
          if (gameXp > 0) earned.push({ xp: gameXp, reason: XP_REASONS.game });
          if (dayXp > 0) earned.push({ xp: dayXp, reason: XP_REASONS.today });
        }

        const appendedQuestions = outcome.appendedFromPosition === null
          ? []
          : await hydrateGameQuestions(
              await prisma.gameQuestion.findMany({
                where: { runId, position: { gte: outcome.appendedFromPosition } },
                orderBy: { position: "asc" },
              }),
              pendingRun.direction as GameDirection,
            );
        return NextResponse.json({
          xpEarned: earned,
          correct: outcome.correct,
          expired: outcome.expired,
          run: toGameRunSummary(outcome.run),
          appendedQuestions,
        }, { status: 200 });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not record the answer.";
        const expected = /not found|already|current question|Invalid answer/.test(message);
        if (!expected) console.error("Failed to record game answer", error);
        return NextResponse.json({ error: expected ? message : "Could not record the answer." }, { status: expected ? 409 : 500 });
      }
    },
  });
}
