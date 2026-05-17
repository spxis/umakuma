import type { QueueResponse, StudyCounts, StudyQueueMode } from "./studyExplorerTypes";

export type StudyExplorerStorageKeys = {
  counts: string;
  selectedSubject: string;
  typeFilter: string;
  viewedLevel: string;
  srsStageFilter: string;
  recentOnly: string;
  showLocked: string;
};

export function buildStudyExplorerStorageKeys(
  accountId: string,
  queueMode: StudyQueueMode,
): StudyExplorerStorageKeys {
  return {
    counts: `wr:study-queue-counts:${accountId}`,
    selectedSubject: `wr:study-selected-subject:${accountId}:${queueMode}`,
    typeFilter: `wr:study-type-filter:${accountId}:${queueMode}`,
    viewedLevel: `wr:study-viewed-level:${accountId}:${queueMode}`,
    srsStageFilter: `wr:study-srs-stage-filter:${accountId}:${queueMode}`,
    recentOnly: `wr:study-recent-only:${accountId}:${queueMode}`,
    showLocked: `wr:study-show-locked:${accountId}:${queueMode}`,
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