import { useCallback, useEffect } from "react";

import type { StudyCounts, StudyQueueItem, StudyQueueMode } from "./studyExplorerTypes";
import { sameAssignmentList } from "./studyExplorerEffectsComparators";
import { fetchStudyQueue } from "./studyExplorerUtils";

type Args = {
  queueApiBasePath: string;
  customLibraryId: string | null;
  queueMode: StudyQueueMode;
  initialPageSize: number;
  loadedItems: StudyQueueItem[];
  totalItems: number;
  hasMorePages: boolean;
  isLoadingMore: boolean;
  isLoading: boolean;
  isValidating: boolean;
  hiddenSubmittedAssignmentIds: Set<number>;
  hasActiveFilterConstraints: boolean;
  onSetIsLoadingMore: React.Dispatch<React.SetStateAction<boolean>>;
  onSetLoadMoreError: React.Dispatch<React.SetStateAction<string | null>>;
  onSetLoadedItems: React.Dispatch<React.SetStateAction<StudyQueueItem[]>>;
  onSetTotalItems: React.Dispatch<React.SetStateAction<number>>;
  onSetPersistedCounts: React.Dispatch<React.SetStateAction<StudyCounts | null>>;
};

export function useStudyQueuePagination({
  queueApiBasePath,
  customLibraryId,
  queueMode,
  initialPageSize,
  loadedItems,
  totalItems,
  hasMorePages,
  isLoadingMore,
  isLoading,
  isValidating,
  hiddenSubmittedAssignmentIds,
  hasActiveFilterConstraints,
  onSetIsLoadingMore,
  onSetLoadMoreError,
  onSetLoadedItems,
  onSetTotalItems,
  onSetPersistedCounts,
}: Args) {
  const loadMorePage = useCallback(async () => {
    if (isLoadingMore || !hasMorePages) return;

    onSetIsLoadingMore(true);
    onSetLoadMoreError(null);
    try {
      const params = new URLSearchParams({
        mode: queueMode,
        limit: String(initialPageSize),
        offset: String(loadedItems.length),
      });
      if (customLibraryId) {
        params.set("libraryId", customLibraryId);
      }

      const payload = await fetchStudyQueue(
        `${queueApiBasePath}/queue?${params.toString()}`,
      );
      const payloadVisibleItems = payload.items.filter(
        (item) => !hiddenSubmittedAssignmentIds.has(item.assignmentId),
      );
      const existingIds = new Set(loadedItems.map((item) => item.assignmentId));
      const uniquePayloadItems = payloadVisibleItems.filter((item) => !existingIds.has(item.assignmentId));
      const mergedVisibleCount = loadedItems.length + uniquePayloadItems.length;

      onSetLoadedItems((prev) => {
        const existing = new Set(prev.map((item) => item.assignmentId));
        const merged = [...prev, ...payloadVisibleItems.filter((item) => !existing.has(item.assignmentId))];
        return sameAssignmentList(prev, merged) ? prev : merged;
      });
      const nextTotalRaw = payload.pagination?.total ?? totalItems;
      onSetTotalItems(Math.max(nextTotalRaw, mergedVisibleCount));
      if (payload.counts) onSetPersistedCounts(payload.counts);
    } catch (loadError) {
      onSetLoadMoreError(loadError instanceof Error ? loadError.message : "Could not load more study items.");
    } finally {
      onSetIsLoadingMore(false);
    }
  }, [
    customLibraryId,
    hasMorePages,
    hiddenSubmittedAssignmentIds,
    initialPageSize,
    isLoadingMore,
    loadedItems,
    onSetIsLoadingMore,
    onSetLoadMoreError,
    onSetLoadedItems,
    onSetPersistedCounts,
    onSetTotalItems,
    queueApiBasePath,
    queueMode,
    totalItems,
  ]);

  const hydrateAllPagesForFilters = useCallback(async () => {
    if (isLoadingMore || !hasMorePages) {
      return;
    }

    onSetIsLoadingMore(true);
    onSetLoadMoreError(null);
    try {
      const params = new URLSearchParams({ mode: queueMode });
      if (customLibraryId) {
        params.set("libraryId", customLibraryId);
      }

      const payload = await fetchStudyQueue(`${queueApiBasePath}/queue?${params.toString()}`);
      const payloadVisibleItems = payload.items.filter(
        (item) => !hiddenSubmittedAssignmentIds.has(item.assignmentId),
      );

      onSetLoadedItems((prev) => {
        const payloadIds = new Set(payloadVisibleItems.map((item) => item.assignmentId));
        const merged = [
          ...payloadVisibleItems,
          ...prev.filter((item) => !payloadIds.has(item.assignmentId)),
        ];
        return sameAssignmentList(prev, merged) ? prev : merged;
      });
      const hydratedTotal = payload.pagination?.total ?? payloadVisibleItems.length;
      onSetTotalItems(Math.max(hydratedTotal, payloadVisibleItems.length));
      if (payload.counts) {
        onSetPersistedCounts(payload.counts);
      }
    } catch (loadError) {
      onSetLoadMoreError(loadError instanceof Error ? loadError.message : "Could not refresh filtered study items.");
    } finally {
      onSetIsLoadingMore(false);
    }
  }, [
    customLibraryId,
    hasMorePages,
    hiddenSubmittedAssignmentIds,
    isLoadingMore,
    onSetIsLoadingMore,
    onSetLoadMoreError,
    onSetLoadedItems,
    onSetPersistedCounts,
    onSetTotalItems,
    queueApiBasePath,
    queueMode,
  ]);

  useEffect(() => {
    if (!hasActiveFilterConstraints) {
      return;
    }

    if (isLoading || isValidating || isLoadingMore || !hasMorePages) {
      return;
    }

    void hydrateAllPagesForFilters();
  }, [
    hasActiveFilterConstraints,
    hasMorePages,
    isLoading,
    isLoadingMore,
    isValidating,
    hydrateAllPagesForFilters,
  ]);

  return { loadMorePage };
}
