import { prisma } from "@/lib/prisma";
import type { ReviewPerformance } from "@/lib/reviewDifficulty";

type SubjectWithId = {
  subjectId?: unknown;
  radicals?: unknown;
  visuallySimilar?: unknown;
  usedInVocabulary?: unknown;
  componentKanji?: unknown;
};

const RELATION_KEYS = [
  "radicals",
  "visuallySimilar",
  "usedInVocabulary",
  "componentKanji",
] as const;

const PERFORMANCE_CACHE_TTL_MS = 60_000;
const PERFORMANCE_CACHE_MAX_ACCOUNTS = 200;
const performanceCache = new Map<string, {
  expiresAtMs: number;
  subjectIds: Set<number>;
  performance: Map<number, ReviewPerformance>;
}>();

function prunePerformanceCache(nowMs: number, currentAccountId: string): void {
  for (const [accountId, entry] of performanceCache) {
    if (entry.expiresAtMs <= nowMs) {
      performanceCache.delete(accountId);
    }
  }

  if (performanceCache.size >= PERFORMANCE_CACHE_MAX_ACCOUNTS && !performanceCache.has(currentAccountId)) {
    const oldestAccountId = performanceCache.keys().next().value;
    if (typeof oldestAccountId === "string") {
      performanceCache.delete(oldestAccountId);
    }
  }
}

export function calculateReviewSuccessRates(
  attempts: Array<{ subjectId: number; result: "correct" | "wrong" }>,
): Map<number, number> {
  const performanceBySubjectId = calculateReviewPerformance(attempts);

  return new Map(
    Array.from(performanceBySubjectId, ([subjectId, performance]) => [
      subjectId,
      Math.round((performance.correct / performance.total) * 100),
    ]),
  );
}

export function calculateReviewPerformance(
  attempts: Array<{ subjectId: number; result: "correct" | "wrong" }>,
): Map<number, ReviewPerformance> {
  const totalsBySubjectId = new Map<number, ReviewPerformance>();
  for (const attempt of attempts) {
    const totals = totalsBySubjectId.get(attempt.subjectId) ?? { correct: 0, total: 0 };
    totals.total += 1;
    if (attempt.result === "correct") {
      totals.correct += 1;
    }
    totalsBySubjectId.set(attempt.subjectId, totals);
  }

  return totalsBySubjectId;
}

export async function fetchReviewPerformance(
  accountId: string,
  subjectIds: number[],
): Promise<Map<number, ReviewPerformance>> {
  const uniqueSubjectIds = Array.from(new Set(subjectIds));
  if (uniqueSubjectIds.length === 0) {
    return new Map();
  }

  const cached = performanceCache.get(accountId);
  if (
    cached &&
    cached.expiresAtMs > Date.now() &&
    uniqueSubjectIds.every((subjectId) => cached.subjectIds.has(subjectId))
  ) {
    return cached.performance;
  }

  const groupedAttempts = await prisma.studyReviewAttempt.groupBy({
    by: ["subjectId", "result"],
    where: {
      accountId,
      subjectId: { in: uniqueSubjectIds },
      result: { in: ["correct", "wrong"] },
    },
    _count: { _all: true },
  });

  const performance = new Map<number, ReviewPerformance>();
  for (const row of groupedAttempts) {
    const totals = performance.get(row.subjectId) ?? { correct: 0, total: 0 };
    totals.total += row._count._all;
    if (row.result === "correct") {
      totals.correct += row._count._all;
    }
    performance.set(row.subjectId, totals);
  }

  const nowMs = Date.now();
  prunePerformanceCache(nowMs, accountId);
  performanceCache.set(accountId, {
    expiresAtMs: nowMs + PERFORMANCE_CACHE_TTL_MS,
    subjectIds: new Set(uniqueSubjectIds),
    performance,
  });
  return performance;
}

export function applyReviewSuccessRates<T extends SubjectWithId>(
  items: T[],
  performanceBySubjectId: Map<number, ReviewPerformance>,
): Array<T & { successRate?: number }> {
  const addSuccessRate = <U extends SubjectWithId>(item: U): U & { successRate?: number } => {
    if (typeof item.subjectId !== "number") {
      return item;
    }

    const performance = performanceBySubjectId.get(item.subjectId);
    if (!performance || performance.total <= 0) {
      return item;
    }

    return {
      ...item,
      successRate: Math.round((performance.correct / performance.total) * 100),
    };
  };

  return items.map((item) => ({
    ...addSuccessRate(item),
    ...Object.fromEntries(
      RELATION_KEYS.flatMap((key) =>
        Array.isArray(item[key])
          ? [[key, (item[key] as SubjectWithId[]).map(addSuccessRate)]]
          : [],
      ),
    ),
  }));
}

function collectSubjects(items: SubjectWithId[]): SubjectWithId[] {
  return items.flatMap((item) => [
    item,
    ...RELATION_KEYS.flatMap((key) =>
      Array.isArray(item[key]) ? (item[key] as SubjectWithId[]) : [],
    ),
  ]);
}

export async function withReviewSuccessRates<T extends SubjectWithId>(
  accountId: string,
  items: T[],
): Promise<Array<T & { successRate?: number }>> {
  const subjectIds = Array.from(
    new Set(
      collectSubjects(items)
        .map((item) => item.subjectId)
        .filter((subjectId): subjectId is number =>
          typeof subjectId === "number" && Number.isInteger(subjectId) && subjectId > 0,
        ),
    ),
  );

  if (subjectIds.length === 0) {
    return items;
  }

  return applyReviewSuccessRates(items, await fetchReviewPerformance(accountId, subjectIds));
}
