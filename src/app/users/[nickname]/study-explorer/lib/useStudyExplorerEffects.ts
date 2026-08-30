import { useCallback, useEffect, useRef } from "react";
import type { QueueResponse, StudyCounts, StudyQueueMode, StudyQueueItem, StudySrsFilter, StudySrsStageFilter, StudyTypeFilter } from "./studyExplorerTypes";
import { STUDY_QUEUE_TYPES, STUDY_SRS_FILTERS, STUDY_TYPE_FILTERS } from "./studyExplorerDomain";
import { sameAssignmentList, sameCounts, sameLevelCounts, sameTypeCounts, sameTypeCountsByLevel } from "./studyExplorerEffectsComparators";
import { persistQueue, readStoredQueue } from "./studyExplorerUtils";
import { resolveEffectiveSrsFilter, resolveEffectiveSrsStageFilter, resolveEffectiveTypeFilter, resolveEffectiveViewedLevelFilter } from "./studyExplorerState";
import { useStudyExplorerHydrationEffects } from "./useStudyExplorerHydrationEffects";

type Args = {
  accountId: string;
  queueMode: StudyQueueMode;
  queueStorageScopeKey?: string;
  countsStorageKey: string;
  selectedSubjectStorageKey: string;
  typeFilterStorageKey: string;
  viewedLevelStorageKey: string;
  srsStageFilterStorageKey: string;
  recentOnlyStorageKey: string;
  showLockedStorageKey: string;
  viewedLevel: number | null;
  effectiveViewedLevel: number | null;
  typeFilter: StudyTypeFilter;
  srsFilter: StudySrsFilter;
  srsStageFilter: StudySrsStageFilter | null;
  recentOnly: boolean;
  showLocked: boolean;
  hasData: boolean;
  hasHydratedTypeFilter: boolean;
  setHasHydratedTypeFilter: React.Dispatch<React.SetStateAction<boolean>>;
  hasHydratedViewedLevel: boolean;
  setHasHydratedViewedLevel: React.Dispatch<React.SetStateAction<boolean>>;
  hiddenSubmittedAssignmentIds: Set<number>;
  loadedItems: StudyQueueItem[];
  totalItems: number;
  counts: StudyCounts | null;
  levelCounts: Record<number, number>;
  reviewLevelCounts: Record<number, number>;
  typeCounts: NonNullable<QueueResponse["typeCounts"]>;
  typeCountsByLevel: NonNullable<QueueResponse["typeCountsByLevel"]>;
  srsCounts: QueueResponse["srsCounts"];
  srsStageCounts: Record<number, number> | undefined;
  dataItems: StudyQueueItem[] | undefined;
  dataCached: boolean | undefined;
  dataPaginationTotal: number | undefined;
  dataCounts: StudyCounts | undefined;
  setCachedQueueData: React.Dispatch<React.SetStateAction<QueueResponse | undefined>>;
  setPersistedCounts: React.Dispatch<React.SetStateAction<StudyCounts | null>>;
  setLoadedItems: React.Dispatch<React.SetStateAction<StudyQueueItem[]>>;
  setTotalItems: React.Dispatch<React.SetStateAction<number>>;
  setSelectedId: React.Dispatch<React.SetStateAction<number | null>>;
  setTypeFilter: React.Dispatch<React.SetStateAction<StudyTypeFilter>>;
  setRecentOnly: React.Dispatch<React.SetStateAction<boolean>>;
  setLoadMoreError: React.Dispatch<React.SetStateAction<string | null>>;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  setViewedLevel: React.Dispatch<React.SetStateAction<number | null>>;
  setSrsFilter: React.Dispatch<React.SetStateAction<StudySrsFilter>>;
  setSrsStageFilter: React.Dispatch<React.SetStateAction<StudySrsStageFilter | null>>;
  setShowLocked: React.Dispatch<React.SetStateAction<boolean>>;
  lastHandledStudyQueryRef: React.MutableRefObject<string>;
};

export function useStudyExplorerEffects({
  accountId,
  queueMode,
  queueStorageScopeKey,
  countsStorageKey,
  selectedSubjectStorageKey,
  typeFilterStorageKey,
  viewedLevelStorageKey,
  srsStageFilterStorageKey,
  recentOnlyStorageKey,
  showLockedStorageKey,
  viewedLevel,
  effectiveViewedLevel,
  typeFilter,
  srsFilter,
  srsStageFilter,
  recentOnly,
  showLocked,
  hasData,
  hasHydratedTypeFilter,
  setHasHydratedTypeFilter,
  hasHydratedViewedLevel,
  setHasHydratedViewedLevel,
  hiddenSubmittedAssignmentIds,
  loadedItems,
  totalItems,
  counts,
  levelCounts,
  reviewLevelCounts,
  typeCounts,
  typeCountsByLevel,
  srsCounts,
  srsStageCounts,
  dataItems,
  dataCached,
  dataPaginationTotal,
  dataCounts,
  setCachedQueueData,
  setPersistedCounts,
  setLoadedItems,
  setTotalItems,
  setSelectedId,
  setTypeFilter,
  setRecentOnly,
  setLoadMoreError,
  setSearchQuery,
  setViewedLevel,
  setSrsFilter,
  setSrsStageFilter,
  setShowLocked,
  lastHandledStudyQueryRef,
}: Args) {
  useStudyExplorerHydrationEffects({
    countsStorageKey,
    typeFilterStorageKey,
    viewedLevelStorageKey,
    recentOnlyStorageKey,
    showLockedStorageKey,
    srsStageFilterStorageKey,
    selectedSubjectStorageKey,
    setPersistedCounts,
    setTypeFilter,
    setHasHydratedTypeFilter,
    setViewedLevel,
    setHasHydratedViewedLevel,
    setRecentOnly,
    setShowLocked,
    setSrsFilter,
    setSrsStageFilter,
    hasHydratedTypeFilter,
    hasHydratedViewedLevel,
    typeFilter,
    viewedLevel,
    srsFilter,
    srsStageFilter,
    recentOnly,
    showLocked,
    setSelectedId,
    setSearchQuery,
    lastHandledStudyQueryRef,
  });

  const hiddenSubmittedCountRef = useRef(hiddenSubmittedAssignmentIds.size);
  const loadedItemsRef = useRef(loadedItems);
  const totalItemsRef = useRef(totalItems);

  useEffect(() => {
    hiddenSubmittedCountRef.current = hiddenSubmittedAssignmentIds.size;
  }, [hiddenSubmittedAssignmentIds]);

  useEffect(() => {
    loadedItemsRef.current = loadedItems;
  }, [loadedItems]);

  useEffect(() => {
    totalItemsRef.current = totalItems;
  }, [totalItems]);

  useEffect(() => {
    if (!hasData) return;
    const selectedTypeCountAtViewedLevel = viewedLevel === null ? typeCounts.all : queueMode === STUDY_QUEUE_TYPES.review ? (reviewLevelCounts[viewedLevel] ?? 0) : (typeCountsByLevel[viewedLevel]?.[typeFilter] ?? 0);

    const nextViewedLevel = resolveEffectiveViewedLevelFilter(
      viewedLevel,
      effectiveViewedLevel,
      selectedTypeCountAtViewedLevel,
    );
    if (nextViewedLevel !== viewedLevel) setViewedLevel(nextViewedLevel);

    const nextTypeFilter = resolveEffectiveTypeFilter(typeFilter, typeCounts);
    if (nextTypeFilter !== typeFilter) setTypeFilter(nextTypeFilter);

    const nextSrsFilter = resolveEffectiveSrsFilter(srsFilter, srsCounts);
    if (nextSrsFilter !== srsFilter) setSrsFilter(nextSrsFilter);

    const nextSrsStageFilter = resolveEffectiveSrsStageFilter(srsStageFilter, srsStageCounts);
    if (nextSrsStageFilter !== srsStageFilter) setSrsStageFilter(nextSrsStageFilter);
  }, [effectiveViewedLevel, hasData, queueMode, reviewLevelCounts, srsCounts, srsFilter, srsStageCounts, srsStageFilter, setSrsFilter, setSrsStageFilter, setTypeFilter, setViewedLevel, typeCounts, typeCountsByLevel, typeFilter, viewedLevel]);

  useEffect(() => {
    if (!dataCounts || !Number.isFinite(dataCounts.all) || !Number.isFinite(dataCounts.reviews) || !Number.isFinite(dataCounts.lessons)) return;
    if (hiddenSubmittedCountRef.current > 0) return;
    const serializedCounts = JSON.stringify(dataCounts);
    if (window.localStorage.getItem(countsStorageKey) === serializedCounts) return;
    window.localStorage.setItem(countsStorageKey, serializedCounts);
  }, [countsStorageKey, dataCounts, setPersistedCounts]);

  useEffect(() => {
    if (!dataItems) return;

    const fresh = dataItems.filter((item) => !hiddenSubmittedAssignmentIds.has(item.assignmentId));
    const freshIds = new Set(fresh.map((item) => item.assignmentId));
    const currentLoadedItems = loadedItemsRef.current;
    const priorVisible = currentLoadedItems.filter((item) => !hiddenSubmittedAssignmentIds.has(item.assignmentId));
    const isAuthoritativeFullSnapshot = Number.isInteger(dataPaginationTotal) && (dataPaginationTotal ?? -1) >= 0 && fresh.length >= (dataPaginationTotal ?? 0);
    const merged = isAuthoritativeFullSnapshot || priorVisible.length === 0 ? fresh : [...fresh, ...priorVisible.filter((item) => !freshIds.has(item.assignmentId))];
    const mergedVisibleCount = merged.length;

    if (!sameAssignmentList(currentLoadedItems, merged)) {
      setLoadedItems(merged);
      loadedItemsRef.current = merged;
    }

    const nextTotalRaw = dataPaginationTotal ?? fresh.length;
    const nextTotal = isAuthoritativeFullSnapshot ? nextTotalRaw : Math.max(nextTotalRaw, mergedVisibleCount);
    const currentTotal = totalItemsRef.current;
    const stableTotal = dataCached === undefined && nextTotal < currentTotal ? currentTotal : nextTotal;

    if (stableTotal !== currentTotal) {
      totalItemsRef.current = stableTotal;
      setTotalItems(stableTotal);
    }
  }, [
    dataCached,
    dataItems,
    dataPaginationTotal,
    hiddenSubmittedAssignmentIds,
    setLoadedItems,
    setTotalItems,
  ]);

  useEffect(() => {
    if (dataItems === undefined && loadedItems.length === 0 && totalItems === 0) {
      return;
    }

    const nextCounts = counts ?? { all: loadedItems.length, reviews: 0, lessons: 0 };
    const nextPayload: QueueResponse = {
      items: loadedItems,
      counts: nextCounts,
      levelCounts,
      typeCounts,
      typeCountsByLevel,
      srsCounts,
      srsStageCounts,
      pagination: {
        offset: 0,
        limit: loadedItems.length,
        total: totalItems,
        hasMore: loadedItems.length < totalItems,
      },
    };

    persistQueue(accountId, queueMode, loadedItems, totalItems, counts ?? null, levelCounts, typeCounts, typeCountsByLevel, srsCounts, srsStageCounts, queueStorageScopeKey);
    setCachedQueueData((prev) => {
      if (!prev) {
        return nextPayload;
      }

      const prevPagination = prev.pagination;
      const nextPagination = nextPayload.pagination;
      const samePagination =
        prevPagination?.offset === nextPagination?.offset &&
        prevPagination?.limit === nextPagination?.limit &&
        prevPagination?.total === nextPagination?.total &&
        prevPagination?.hasMore === nextPagination?.hasMore;

      const unchanged =
        sameAssignmentList(prev.items, nextPayload.items) &&
        sameCounts(prev.counts, nextPayload.counts) &&
        sameLevelCounts(prev.levelCounts, nextPayload.levelCounts) &&
        sameTypeCounts(prev.typeCounts, nextPayload.typeCounts) &&
        sameTypeCountsByLevel(prev.typeCountsByLevel, nextPayload.typeCountsByLevel) &&
        samePagination;

      return unchanged ? prev : nextPayload;
    });
  }, [accountId, counts, dataItems, levelCounts, loadedItems, queueStorageScopeKey, queueMode, setCachedQueueData, totalItems, typeCounts, typeCountsByLevel, srsCounts, srsStageCounts]);

  useEffect(() => {
    setCachedQueueData(readStoredQueue(accountId, queueMode, queueStorageScopeKey));
    setLoadMoreError(null);

    try {
      const fromUrl = Number(new URLSearchParams(window.location.search).get("subject"));
      if (Number.isInteger(fromUrl) && fromUrl > 0) {
        setSelectedId(fromUrl);
        return;
      }

      const raw = window.localStorage.getItem(selectedSubjectStorageKey);
      const parsed = Number(raw);
      setSelectedId(Number.isInteger(parsed) && parsed > 0 ? parsed : null);
    } catch {
      setSelectedId(null);
    }
  }, [accountId, queueMode, queueStorageScopeKey, selectedSubjectStorageKey, setCachedQueueData, setLoadMoreError, setSelectedId]);

  const clearAllFilters = useCallback(() => {
    setViewedLevel(null);
    setTypeFilter(STUDY_TYPE_FILTERS.all);
    setSrsFilter(STUDY_SRS_FILTERS.all);
    setSrsStageFilter(null);
    setShowLocked(false);
    setRecentOnly(false);
    setSelectedId(null);
    setSearchQuery("");

    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    params.delete("findStudy");
    params.delete("findLevel");
    params.delete("findJlpt");
    params.delete("level");
    params.delete("type");
    params.delete("srs");
    params.delete("srsStage");
    params.delete("recent");
    params.delete("hideLocked");
    const query = params.toString();
    const next = `${window.location.pathname}${query ? `?${query}` : ""}#explorer`;
    window.history.pushState(null, "", next);
    window.dispatchEvent(new CustomEvent("wr:explorer-search-clear", { detail: { scope: STUDY_TYPE_FILTERS.all } }));
  }, [
    setRecentOnly,
    setSearchQuery,
    setSelectedId,
    setShowLocked,
    setSrsFilter,
    setSrsStageFilter,
    setTypeFilter,
    setViewedLevel,
  ]);

  return { clearAllFilters };
}
