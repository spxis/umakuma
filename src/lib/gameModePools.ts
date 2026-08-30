import "server-only";

import {
  GAME_DAILY_LEVEL_COHORT,
  GAME_PRACTICE_LISTS,
  GAME_PRACTICE_MINIMUM_TARGET_POOL,
  GAME_PRACTICE_TARGET_POOL_MULTIPLIER,
  type GameCategory,
  type GamePracticeList,
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

async function loadTaggedSubjectIds(accountId: string, list: GamePracticeList): Promise<Set<number> | null> {
  if (list === GAME_PRACTICE_LISTS.toughest) return null;
  try {
    const rows = await prisma.studySubjectTag.findMany({
      where: list === GAME_PRACTICE_LISTS.trouble
        ? { accountId, trouble: true }
        : { accountId, favorite: true },
      select: { subjectId: true },
    });
    return new Set(rows.map((row) => row.subjectId));
  } catch (error) {
    if (!isMissingTableError(error)) throw error;
    return new Set();
  }
}

/**
 * Practice drills one list at a time.
 *
 * `trouble` and `favorite` take only what the player tagged, so a practice run
 * is exactly the list they curated. `toughest` needs no tags at all and ranks
 * the whole pool by the shared review-difficulty score. Distractors always come
 * from the full pool, so the choices stay confusable rather than merely hard.
 */
export async function loadPracticePool(
  accountId: string,
  category: GameCategory,
  batchSize: number,
  list: GamePracticeList,
): Promise<{
  account: { nickname: string; wkUsername: string; wkLevel: number };
  items: GameCatalogItem[];
  targets: GameCatalogItem[];
}> {
  const { account, items } = await loadGamePool(accountId, null, category);
  const [taggedIds, performance] = await Promise.all([
    loadTaggedSubjectIds(accountId, list),
    loadReviewPerformance(accountId),
  ]);

  const nowMs = Date.now();
  const ranked = items
    .filter((item) => taggedIds === null || taggedIds.has(item.subjectId))
    .map((item) => ({
      item,
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
      const easeDiff = left.ease - right.ease;
      if (easeDiff !== 0) return easeDiff;
      return left.item.subjectId - right.item.subjectId;
    });

  const targetPoolSize = Math.max(
    GAME_PRACTICE_MINIMUM_TARGET_POOL,
    batchSize * GAME_PRACTICE_TARGET_POOL_MULTIPLIER,
  );

  return {
    account,
    items,
    targets: ranked.slice(0, targetPoolSize).map((entry) => entry.item),
  };
}

/**
 * The level every Daily Challenge is built at: the lowest level among the top
 * `GAME_DAILY_LEVEL_COHORT` accounts. Shared by the pool builder and the setup
 * endpoint so the number shown always matches the number used.
 */
export async function resolveDailyLevelCap(): Promise<number> {
  const rows = await prisma.account.findMany({
    orderBy: { wkLevel: "desc" },
    take: GAME_DAILY_LEVEL_COHORT,
    select: { wkLevel: true },
  });
  if (rows.length === 0) return 1;
  return Math.max(1, Math.min(...rows.map((row) => row.wkLevel ?? 0)));
}

/**
 * Daily Challenge draws from the shared catalog rather than one account's
 * assignments, capped at the level the regular players share.
 */
export async function loadDailyPool(): Promise<{ levelCap: number; items: GameCatalogItem[] }> {
  const levelCap = await resolveDailyLevelCap();

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
