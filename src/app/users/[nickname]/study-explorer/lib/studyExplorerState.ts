import type { QueueResponse, StudyCounts, StudyQueueMode, StudySrsFilter, StudySrsStageFilter, StudyTypeFilter, StudyWaitSortOrder } from "./studyExplorerTypes";
import { STUDY_QUEUE_TYPES, STUDY_SRS_FILTERS, STUDY_TYPE_FILTERS } from "./studyExplorerDomain";

export type StudyExplorerStorageKeys = {
  counts: string;
  selectedSubject: string;
  typeFilter: string;
  viewedLevel: string;
  srsStageFilter: string;
  recentOnly: string;
  showLocked: string;
  waitSort: string;
  waitRandomOrder: string;
};

export function buildStudyExplorerStorageKeys(
  accountId: string,
  queueMode: StudyQueueMode,
  scopeKey?: string,
): StudyExplorerStorageKeys {
  const suffix = scopeKey ? `:${scopeKey}` : "";

  return {
    counts: `wr:study-queue-counts:${accountId}${suffix}`,
    selectedSubject: `wr:study-selected-subject:${accountId}:${queueMode}${suffix}`,
    typeFilter: `wr:study-type-filter:${accountId}:${queueMode}${suffix}`,
    viewedLevel: `wr:study-viewed-level:${accountId}:${queueMode}${suffix}`,
    srsStageFilter: `wr:study-srs-stage-filter:${accountId}:${queueMode}${suffix}`,
    recentOnly: `wr:study-recent-only:${accountId}:${queueMode}${suffix}`,
    showLocked: `wr:study-show-locked:${accountId}:${queueMode}${suffix}`,
    waitSort: `wr:study-wait-sort:${accountId}:${queueMode}${suffix}`,
    waitRandomOrder: `wr:study-wait-random-order:${accountId}:${queueMode}${suffix}`,
  };
}

export function deriveInitialQueueState(cachedQueueData: QueueResponse | undefined): {
  loadedItems: QueueResponse["items"];
  totalItems: number;
  persistedCounts: StudyCounts | null;
} {
  return {
    loadedItems: cachedQueueData?.items ?? [],
    totalItems: cachedQueueData?.pagination?.total ?? cachedQueueData?.items.length ?? 0,
    persistedCounts: cachedQueueData?.counts ?? null,
  };
}

export function readStoredStudyCounts(countsStorageKey: string): StudyCounts | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(countsStorageKey);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StudyCounts>;
    if (typeof parsed.all !== "number" || typeof parsed.reviews !== "number" || typeof parsed.lessons !== "number") {
      return null;
    }

    return { all: parsed.all, reviews: parsed.reviews, lessons: parsed.lessons };
  } catch {
    return null;
  }
}

export function resolveEffectiveTypeFilter(
  typeFilter: StudyTypeFilter,
  typeCounts: { all: number; radical: number; kanji: number; vocabulary: number },
): StudyTypeFilter {
  if (typeFilter === STUDY_TYPE_FILTERS.all) {
    return typeFilter;
  }

  return typeCounts[typeFilter] > 0 ? typeFilter : STUDY_TYPE_FILTERS.all;
}

export function resolveEffectiveSrsStageFilter(
  srsStageFilter: StudySrsStageFilter | null,
  srsStageCounts: Record<number, number> | undefined,
): StudySrsStageFilter | null {
  if (srsStageFilter === null) {
    return null;
  }

  return (srsStageCounts?.[srsStageFilter] ?? 0) > 0 ? srsStageFilter : null;
}

export function resolveEffectiveSrsFilter(
  srsFilter: StudySrsFilter,
  srsCounts: {
    all: number;
    locked: number;
    apprentice: number;
    guru: number;
    master: number;
    enlightened: number;
    burned: number;
  } | undefined,
): StudySrsFilter {
  if (srsFilter === STUDY_SRS_FILTERS.all) {
    return srsFilter;
  }

  return (srsCounts?.[srsFilter] ?? 0) > 0 ? srsFilter : STUDY_SRS_FILTERS.all;
}

export function resolveEffectiveViewedLevelFilter(
  viewedLevel: number | null,
  effectiveViewedLevel: number | null,
  levelAllCount: number,
): number | null {
  if (viewedLevel !== null && levelAllCount <= 0) {
    return null;
  }

  return effectiveViewedLevel;
}

export function shouldUseServerReviewAggregateCounts({
  queueMode,
  srsFilter,
  srsStageFilter,
  recentOnly,
  showLocked,
  hiddenSubmittedCount = 0,
}: {
  queueMode: StudyQueueMode;
  srsFilter: StudySrsFilter;
  srsStageFilter: StudySrsStageFilter | null;
  recentOnly: boolean;
  showLocked: boolean;
  hiddenSubmittedCount?: number;
}): boolean {
  return (
    queueMode === STUDY_QUEUE_TYPES.review &&
    srsFilter === STUDY_SRS_FILTERS.all &&
    srsStageFilter === null &&
    !recentOnly &&
    showLocked &&
    hiddenSubmittedCount <= 0
  );
}

/**
 * What the queue mode and the source override.
 *
 * A lesson has no SRS stage to filter by, nothing is locked to it, and
 * "recent" means nothing for an item never seen - so the review filters are
 * not merely ignored there, they are answered differently. Sorting by
 * difficulty is the same shape one level along: it needs a review history,
 * which a member's own uploaded library does not have.
 *
 * Kept together and out of the component, because seven lines that each begin
 * `queueMode === lesson ?` are one rule wearing seven coats.
 */
export function effectiveQueueFilters(input: {
  queueMode: StudyQueueMode;
  srsFilter: StudySrsFilter;
  srsStageFilter: StudySrsStageFilter | null;
  recentOnly: boolean;
  showLocked: boolean;
  normalizeSrsStageFilter: (
    srsFilter: StudySrsFilter,
    srsStageFilter: StudySrsStageFilter | null,
  ) => StudySrsStageFilter | null;
}): {
  srsFilter: StudySrsFilter;
  srsStageFilter: StudySrsStageFilter | null;
  recentOnly: boolean;
  showLocked: boolean;
} {
  const lesson = input.queueMode === STUDY_QUEUE_TYPES.lesson;

  return {
    srsFilter: lesson ? STUDY_SRS_FILTERS.all : input.srsFilter,
    srsStageFilter: lesson ? null : input.normalizeSrsStageFilter(input.srsFilter, input.srsStageFilter),
    recentOnly: lesson ? false : input.recentOnly,
    showLocked: lesson ? true : input.showLocked,
  };
}

/**
 * The sort a queue can actually honour.
 *
 * Sorting by how hard an item is needs a review history to be hard in: a
 * member's own uploaded library has none, and a lesson has not happened yet.
 * Asked as a plain value rather than folded into the filters above, because
 * the sorted list is memoised on it and the compiler will not memoise across
 * a field of an object it cannot prove is unchanged.
 */
export function usableWaitSortOrder(
  waitSortOrder: StudyWaitSortOrder,
  where: { queueMode: StudyQueueMode; studySourceIsCustom: boolean },
): StudyWaitSortOrder {
  const byDifficulty = waitSortOrder === "easiest" || waitSortOrder === "hardest";
  const canSort = !where.studySourceIsCustom && where.queueMode === STUDY_QUEUE_TYPES.review;
  return byDifficulty && !canSort ? "oldest_wait" : waitSortOrder;
}
