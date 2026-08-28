import "server-only";

import {
  GAME_REVENGE_MINIMUM_TARGET_POOL,
  GAME_REVENGE_TARGET_POOL_MULTIPLIER,
  type GameCategory,
} from "@/lib/gameMode";
import { CATALOG_SELECT, loadGamePool, toCatalogItem } from "@/lib/gameModeServer";
import type { GameCatalogItem } from "@/lib/gameQuestionBuilder";
import { shiritoriHeadKey, shiritoriTailKey } from "@/lib/gameShiritori";
import { prisma } from "@/lib/prisma";
import { reviewEaseScore, type ReviewPerformance } from "@/lib/reviewDifficulty";

const DAILY_SYNTHETIC_ASSIGNMENT = { assignmentId: 0, srsStage: 1, startedAt: "1970-01-01T00:00:00.000Z" } as const;
const REVIEW_RESULTS = { correct: "correct", wrong: "wrong" } as const;

function isMissingTableError(error: unknown): boolean {
  return Boolean(error) && typeof error === "object" && (error as { code?: string }).code === "P2021";
}

/**
 * Local self-graded review history, aggregated in Postgres so a large attempt
 * table never reaches the app as raw rows.
 */
async function loadReviewPerformance(accountId: string): Promise<Map<number, ReviewPerformance>> {
  const performance = new Map<number, ReviewPerformance>();
  try {
    const rows = await prisma.studyReviewAttempt.groupBy({
      by: ["subjectId", "result"],
      where: { accountId },
      _count: { _all: true },
    });
    for (const row of rows) {
      const current = performance.get(row.subjectId) ?? { correct: 0, total: 0 };
      const count = row._count._all;
      performance.set(row.subjectId, {
        correct: current.correct + (row.result === REVIEW_RESULTS.correct ? count : 0),
        total: current.total + count,
      });
    }
  } catch (error) {
    if (!isMissingTableError(error)) throw error;
  }
  return performance;
}

async function loadTroubleSubjectIds(accountId: string): Promise<Set<number>> {
  try {
    const rows = await prisma.studySubjectTag.findMany({
      where: { accountId, trouble: true },
      select: { subjectId: true },
    });
    return new Set(rows.map((row) => row.subjectId));
  } catch (error) {
    if (!isMissingTableError(error)) throw error;
    return new Set();
  }
}

/**
 * Revenge targets the items this account actually struggles with: anything they
 * tagged as trouble first, then the lowest-ease items from the shared review
 * difficulty formula. Distractors still come from the full pool so the choices
 * stay confusable rather than merely hard.
 */
export async function loadRevengePool(
  accountId: string,
  category: GameCategory,
  batchSize: number,
): Promise<{
  account: { nickname: string; wkUsername: string; wkLevel: number };
  items: GameCatalogItem[];
  targets: GameCatalogItem[];
  troubleCount: number;
}> {
  const { account, items } = await loadGamePool(accountId, null, category);
  const [troubleIds, performance] = await Promise.all([
    loadTroubleSubjectIds(accountId),
    loadReviewPerformance(accountId),
  ]);

  const nowMs = Date.now();
  const ranked = [...items]
    .map((item) => ({
      item,
      trouble: troubleIds.has(item.subjectId),
      ease: reviewEaseScore(
        {
          subjectId: item.subjectId,
          srsStage: item.srsStage,
          wkLevel: item.level,
          performance: performance.get(item.subjectId),
        },
        nowMs,
      ),
    }))
    .sort((left, right) => {
      if (left.trouble !== right.trouble) return left.trouble ? -1 : 1;
      const easeDiff = left.ease - right.ease;
      if (easeDiff !== 0) return easeDiff;
      return left.item.subjectId - right.item.subjectId;
    });

  const targetPoolSize = Math.max(
    GAME_REVENGE_MINIMUM_TARGET_POOL,
    batchSize * GAME_REVENGE_TARGET_POOL_MULTIPLIER,
  );

  return {
    account,
    items,
    targets: ranked.slice(0, targetPoolSize).map((entry) => entry.item),
    troubleCount: ranked.filter((entry) => entry.trouble).length,
  };
}

/**
 * Daily Challenge draws from the shared catalog rather than one account's
 * assignments, capped at the lowest WaniKani level in the family so every player
 * has plausibly unlocked every item.
 */
export async function loadDailyPool(): Promise<{ levelCap: number; items: GameCatalogItem[] }> {
  const [{ _min }, accountCount] = await Promise.all([
    prisma.account.aggregate({ _min: { wkLevel: true } }),
    prisma.account.count(),
  ]);
  const levelCap = Math.max(1, accountCount === 0 ? 1 : _min.wkLevel ?? 1);

  const rows = await prisma.wkSubjectCatalog.findMany({
    where: { level: { lte: levelCap }, hiddenAt: null, characters: { not: null } },
    select: CATALOG_SELECT,
    orderBy: { wkSubjectId: "asc" },
  });

  return {
    levelCap,
    items: rows.flatMap((row) => {
      const item = toCatalogItem(row, DAILY_SYNTHETIC_ASSIGNMENT);
      return item ? [item] : [];
    }),
  };
}

/** Vocabulary whose primary reading can both continue and extend a kana chain. */
export async function loadShiritoriPool(accountId: string): Promise<{
  account: { nickname: string; wkUsername: string; wkLevel: number };
  items: GameCatalogItem[];
}> {
  const { account, items } = await loadGamePool(accountId, null, "vocabulary");
  return {
    account,
    items: items.filter(
      (item) =>
        Boolean(item.primaryReading) &&
        shiritoriHeadKey(item.primaryReading!) !== null &&
        shiritoriTailKey(item.primaryReading!) !== null,
    ),
  };
}
