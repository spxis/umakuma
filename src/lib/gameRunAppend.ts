import "server-only";

import { GAME_ENDLESS_CYCLE_SIZE, GAME_KINDS, isUltraGameBatchSize, type GameCategory, type GameKind } from "@/lib/gameMode";
import { loadShiritoriPool } from "@/lib/gameModePools";
import { loadGamePool } from "@/lib/gameModeServer";
import {
  buildGameQuestions,
  buildShiritoriQuestion,
  shiritoriChainKeyAfter,
  type GameQuestionInput,
} from "@/lib/gameQuestionBuilder";
import { prisma } from "@/lib/prisma";

export type AppendableRun = {
  id: string;
  accountId: string;
  kind: GameKind;
  batchSize: number;
  level: number | null;
  category: GameCategory;
  hardMode: boolean;
  questionCount: number;
};

async function appendCycle(run: AppendableRun): Promise<GameQuestionInput[]> {
  const { items } = await loadGamePool(run.accountId, run.level, run.category);
  if (items.length === 0) return [];
  // Ultra replays the whole pool each cycle; Time Attack only needs enough
  // questions to outlast the clock, and questionCount grows every append.
  const cycleSize = run.kind === GAME_KINDS.timeAttack
    ? Math.min(items.length, GAME_ENDLESS_CYCLE_SIZE)
    : items.length;
  try {
    return buildGameQuestions(items, cycleSize, run.hardMode).map((question) => ({
      ...question,
      position: question.position + run.questionCount,
    }));
  } catch {
    // A shrinking pool (a level-up sync mid-run) just ends the run instead of failing the answer.
    return [];
  }
}

async function appendShiritoriLink(
  run: AppendableRun,
  answeredTargetSubjectId: number,
): Promise<GameQuestionInput[]> {
  const [{ items }, priorQuestions] = await Promise.all([
    loadShiritoriPool(run.accountId),
    prisma.gameQuestion.findMany({
      where: { runId: run.id },
      select: { targetSubjectId: true },
    }),
  ]);

  const previousItem = items.find((item) => item.subjectId === answeredTargetSubjectId) ?? null;
  if (!previousItem) return [];
  const chainKey = shiritoriChainKeyAfter(previousItem);
  if (!chainKey) return [];

  const question = buildShiritoriQuestion({
    pool: items,
    chainKey,
    position: run.questionCount,
    usedSubjectIds: new Set(priorQuestions.map((row) => row.targetSubjectId)),
    previousItem,
    hardMode: run.hardMode,
  });
  return question ? [question] : [];
}

/**
 * Produces the next cycle for an endless kind. Returning an empty list is a
 * normal outcome — it ends the run (a Shiritori dead end, or an exhausted pool).
 */
export async function buildAppendedQuestions(
  run: AppendableRun,
  answeredTargetSubjectId: number,
): Promise<GameQuestionInput[]> {
  if (run.kind === GAME_KINDS.shiritori) {
    return appendShiritoriLink(run, answeredTargetSubjectId);
  }
  if (run.kind === GAME_KINDS.timeAttack || (run.kind === GAME_KINDS.match && isUltraGameBatchSize(run.batchSize))) {
    return appendCycle(run);
  }
  return [];
}
