import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { gameAnswerProgress, isUltraGameBatchSize } from "@/lib/gameMode";
import { buildGameQuestions, completedRunValues, hydrateGameQuestions, loadGamePool, toGameRunSummary } from "@/lib/gameModeServer";
import { prisma } from "@/lib/prisma";

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
        const pendingUltraMode = isUltraGameBatchSize(pendingQuestion.run.batchSize);
        const shouldAppendUltraCycle =
          pendingUltraMode &&
          parsed.data.selectedSubjectId === pendingQuestion.targetSubjectId &&
          pendingQuestion.position + 1 >= pendingQuestion.run.questionCount;
        const nextCyclePool = shouldAppendUltraCycle
          ? (await loadGamePool(accountId, pendingQuestion.run.level, pendingQuestion.run.category)).items
          : [];
        const nextCycleInputs = shouldAppendUltraCycle
          ? buildGameQuestions(nextCyclePool, nextCyclePool.length, pendingQuestion.run.hardMode)
              .map((question) => ({ ...question, position: question.position + pendingQuestion.run.questionCount }))
          : [];

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
          if (![question.leftSubjectId, question.middleSubjectId, question.rightSubjectId].includes(parsed.data.selectedSubjectId)) {
            throw new Error("Invalid answer choice.");
          }

          const correct = parsed.data.selectedSubjectId === question.targetSubjectId;
          const claimed = await tx.gameQuestion.updateMany({
            where: { id: question.id, correct: null },
            data: { selectedSubjectId: parsed.data.selectedSubjectId, correct, answeredAt: new Date() },
          });
          if (claimed.count !== 1) throw new Error("This question was already answered.");

          const answeredCount = question.run.answeredCount + 1;
          const correctCount = question.run.correctCount + (correct ? 1 : 0);
          const currentStreak = correct ? question.run.currentStreak + 1 : 0;
          const bestStreak = Math.max(question.run.bestStreak, currentStreak);
          const ultraMode = isUltraGameBatchSize(question.run.batchSize);
          const progress = gameAnswerProgress({
            ultraMode,
            correct,
            answeredCount,
            questionCount: question.run.questionCount,
            appendedQuestionCount: nextCycleInputs.length,
          });
          if (progress.appendCycle) {
            await tx.gameQuestion.createMany({ data: nextCycleInputs.map((nextQuestion) => ({ ...nextQuestion, runId })) });
          }
          const run = await tx.gameRun.update({
            where: { id: runId },
            data: {
              answeredCount,
              correctCount,
              currentStreak,
              bestStreak,
              questionCount: progress.questionCount,
              ...(progress.complete
                ? completedRunValues(question.run.startedAt, correctCount, progress.questionCount, bestStreak, question.run.level)
                : {}),
            },
          });
          return { correct, run, appendedFromPosition: progress.appendCycle ? question.run.questionCount : null };
        });

        const appendedQuestions = outcome.appendedFromPosition === null
          ? []
          : await hydrateGameQuestions(await prisma.gameQuestion.findMany({
              where: { runId, position: { gte: outcome.appendedFromPosition } },
              orderBy: { position: "asc" },
            }));
        return NextResponse.json({ correct: outcome.correct, run: toGameRunSummary(outcome.run), appendedQuestions }, { status: 200 });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not record the answer.";
        const expected = /not found|already|current question|Invalid answer/.test(message);
        if (!expected) console.error("Failed to record game answer", error);
        return NextResponse.json({ error: expected ? message : "Could not record the answer." }, { status: expected ? 409 : 500 });
      }
    },
  });
}
