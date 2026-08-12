"use client";

import { useEffect, useMemo, useRef } from "react";

import LevelExplorerContent from "./LevelExplorerContent";
import type { Snapshot, SrsFilter } from "../../explorerTypes";
import { buildLevelExplorerActions } from "../lib/levelExplorerControllerActions";
import { buildLevelExplorerControllerHandlers } from "../lib/levelExplorerControllerHandlers";
import {
  buildLevelExplorerStorageKeys,
  LEVEL_JLPT_FILTERS,
  LEVEL_SRS_FILTERS,
  LEVEL_TYPE_FILTERS,
} from "../lib/levelExplorerState";
import { useLevelExplorerControllerEffects } from "../lib/useLevelExplorerControllerEffects";
import { useLevelExplorerControllerState } from "../lib/useLevelExplorerControllerState";
import { useLevelExplorerDerivedData } from "../lib/useLevelExplorerDerivedData";

type Props = {
  accountId: string;
  isActive?: boolean;
  explorerTitle: string;
  onOpenStudySourceManager: () => void;
  explorerSource: "wanikani" | "custom";
  customLibraryId: string | null;
  maxLevel: number;
  accountPendingReviews: number;
  levelItemCountsByLevel: Record<number, number>;
  initialSnapshot: Snapshot;
  initialSrsFilter?: SrsFilter;
  showEnglish?: boolean;
  canToggleEnglish?: boolean;
  onToggleShowEnglish?: () => void;
  studyMode?: boolean;
};

export default function LevelExplorerController({
  accountId,
  isActive = true,
  explorerTitle,
  onOpenStudySourceManager,
  explorerSource,
  customLibraryId,
  maxLevel,
  accountPendingReviews,
  levelItemCountsByLevel,
  initialSnapshot,
  initialSrsFilter = LEVEL_SRS_FILTERS.all,
  showEnglish = false,
  canToggleEnglish = false,
  onToggleShowEnglish,
  studyMode = false,
}: Props) {
  const forceShowLocked = explorerSource === "custom";
  const allowHideLocked = !forceShowLocked;
  const storageKeys = useMemo(() => buildLevelExplorerStorageKeys(accountId), [accountId]);

  const {
    selectedLevels,
    setSelectedLevels,
    snapshotsByLevel,
    setSnapshotsByLevel,
    srsFilter,
    setSrsFilter,
    typeFilter,
    setTypeFilter,
    jlptFilter,
    setJlptFilter,
    reviewTimingFilter,
    setReviewTimingFilter,
    recentOnly,
    setRecentOnly,
    showLocked,
    setShowLocked,
    selectedSubjectId,
    setSelectedSubjectId,
    visibleTypes,
    setVisibleTypes,
    stickyMerge,
    setStickyMerge,
    filtersCollapsed,
    setFiltersCollapsed,
    loading,
    setLoading,
    error,
    setError,
    searchMatchedSubjectIds,
    setSearchMatchedSubjectIds,
    searchAvailableLevels,
    setSearchAvailableLevels,
    gridColumns,
    setGridColumns,
    pendingHistoryMode,
    setPendingHistoryMode,
  } = useLevelExplorerControllerState({
    explorerSource,
    maxLevel,
    initialSnapshot,
    initialSrsFilter,
    forceShowLocked,
  });

  const applyingUrlStateRef = useRef(false);
  const hasHydratedUrlStateRef = useRef(false);
  const lastHandledFindQueryRef = useRef("");
  const ensureLevelLoadedRef = useRef<(
    level: number,
    forceReload?: boolean,
  ) => Promise<Snapshot | undefined>>(() => Promise.resolve(undefined));

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const onExplorerPageChange = () => {
      setSelectedSubjectId(null);
    };

    window.addEventListener("wr:explorer-page-change", onExplorerPageChange as EventListener);
    return () => {
      window.removeEventListener("wr:explorer-page-change", onExplorerPageChange as EventListener);
    };
  }, [setSelectedSubjectId]);

  const levelOptions = useMemo(() => Array.from({ length: maxLevel }, (_, index) => index + 1), [maxLevel]);

  const {
    markHistoryPush,
    writeUrlState,
    ensureLevelLoaded,
    setVisibleTypesAndPersist,
    setTypeFilterAndEnsureVisible,
    setStickyMergeAndPersist,
    setFiltersCollapsedAndPersist,
    setSrsFilterWithHistory,
    toggleTypeVisibility,
    enableAllTypes,
  } = buildLevelExplorerControllerHandlers({
    accountId,
    explorerSource,
    customLibraryId,
    initialLevel: initialSnapshot.level,
    storageKeys,
    pendingHistoryMode,
    setPendingHistoryMode,
    selectedLevels,
    selectedSubjectId,
    srsFilter,
    typeFilter,
    jlptFilter,
    reviewTimingFilter,
    recentOnly,
    stickyMerge,
    snapshotsByLevel,
    visibleTypes,
    setLoading,
    setError,
    setSnapshotsByLevel,
    setVisibleTypes,
    setSelectedLevels,
    setSelectedSubjectId,
    setTypeFilter,
    setStickyMerge,
    setFiltersCollapsed,
    setSrsFilter,
  });

  const {
    combinedSnapshot,
    levelItemCountsByLevelEffective,
    filteredItems,
    selectedItem,
    selectedItemFromAll,
    counts,
    jlptCounts,
    reviewTimingCounts,
    overdueOutsideSelectedLevels,
    selectedLevelList,
    subjectById,
    vocabularyKanjiLinks,
    hasPrimaryRelatedPanel,
    hasVisuallySimilarPanel,
    hasUsedInVocabularyPanel,
    selectedMeaningExplanation,
    selectedReadingExplanationRaw,
    showReadingExplanation,
  } = useLevelExplorerDerivedData({
    initialSnapshot,
    selectedLevels,
    snapshotsByLevel,
    levelItemCountsByLevel,
    selectedSubjectId,
    accountPendingReviews,
    recentOnly,
    showLocked,
    srsFilter,
    typeFilter,
    jlptFilter,
    reviewTimingFilter,
    visibleTypes,
    searchMatchedSubjectIds,
  });

  const actions = buildLevelExplorerActions({
    maxLevel,
    initialLevel: initialSnapshot.level,
    stickyMerge,
    searchAvailableLevels,
    snapshotsByLevel,
    subjectById,
    combinedItems: combinedSnapshot.items,
    markHistoryPush,
    ensureLevelLoaded: (level) => ensureLevelLoaded(level),
    setError,
    setSelectedSubjectId,
    setSelectedLevels,
    setSearchMatchedSubjectIds,
    setSearchAvailableLevels,
    setVisibleTypesAndPersist,
    setTypeFilterAndEnsureVisible,
    setRecentOnly,
    setTypeFilter,
    setSrsFilter,
    setJlptFilter,
    setReviewTimingFilter,
  });

  useLevelExplorerControllerEffects({
    isActive,
    maxLevel,
    initialSnapshot,
    forceShowLocked,
    customLibraryId,
    storageKeys,
    applyingUrlStateRef,
    hasHydratedUrlStateRef,
    lastHandledFindQueryRef,
    ensureLevelLoadedRef,
    ensureLevelLoaded,
    writeUrlState,
    searchAndReveal: actions.searchAndReveal,
    snapshotsByLevel,
    selectedLevels,
    selectedSubjectId,
    selectedItem,
    selectedItemFromAll,
    srsFilter,
    typeFilter,
    jlptFilter,
    reviewTimingFilter,
    recentOnly,
    showLocked,
    stickyMerge,
    visibleTypes,
    pendingHistoryMode,
    setSelectedLevels,
    setSelectedSubjectId,
    setSrsFilter,
    setTypeFilter,
    setJlptFilter,
    setReviewTimingFilter,
    setRecentOnly,
    setShowLocked,
    setStickyMerge,
    setFiltersCollapsed,
    setVisibleTypes,
    setVisibleTypesAndPersist,
    setGridColumns,
    setSearchMatchedSubjectIds,
    setSearchAvailableLevels,
  });

  return (
    <LevelExplorerContent
      accountId={accountId}
      explorerTitle={explorerTitle}
      onOpenStudySourceManager={onOpenStudySourceManager}
      levelOptions={levelOptions}
      levelItemCountsByLevel={levelItemCountsByLevelEffective}
      selectedLevels={selectedLevels}
      searchAvailableLevels={searchAvailableLevels}
      stickyMerge={stickyMerge}
      visibleTypes={visibleTypes}
      counts={counts}
      jlptCounts={jlptCounts}
      reviewTimingCounts={reviewTimingCounts}
      accountPendingReviews={accountPendingReviews}
      overdueOutsideSelectedLevels={overdueOutsideSelectedLevels}
      selectedLevelList={selectedLevelList}
      filtersCollapsed={filtersCollapsed}
      srsFilter={srsFilter}
      jlptFilter={jlptFilter}
      reviewTimingFilter={reviewTimingFilter}
      recentOnly={recentOnly}
      showLocked={showLocked}
      allowHideLocked={allowHideLocked}
      showEnglish={showEnglish}
      canToggleEnglish={canToggleEnglish}
      studyMode={studyMode}
      loading={loading}
      gridColumns={gridColumns}
      searchMatchedSubjectIds={searchMatchedSubjectIds}
      error={error}
      filteredItems={filteredItems}
      selectedItem={selectedItem}
      selectedMeaningExplanation={selectedMeaningExplanation}
      selectedReadingExplanationRaw={selectedReadingExplanationRaw}
      showReadingExplanation={showReadingExplanation}
      hasPrimaryRelatedPanel={hasPrimaryRelatedPanel}
      hasVisuallySimilarPanel={hasVisuallySimilarPanel}
      hasUsedInVocabularyPanel={hasUsedInVocabularyPanel}
      vocabularyKanjiLinks={vocabularyKanjiLinks}
      subjectById={subjectById}
      onSelectAllLevelsAndClearSearch={actions.selectAllLevelsAndClearSearch}
      onToggleLevel={actions.toggleLevel}
      onSetStickyMerge={setStickyMergeAndPersist}
      onEnableAllTypes={enableAllTypes}
      onToggleTypeVisibility={toggleTypeVisibility}
      onSetFiltersCollapsed={setFiltersCollapsedAndPersist}
      onSetSrsFilter={setSrsFilterWithHistory}
      onSetJlptFilter={(level) => {
        markHistoryPush();
        setSelectedSubjectId(null);
        setJlptFilter(level);
        if (level !== LEVEL_JLPT_FILTERS.all) {
          setTypeFilterAndEnsureVisible(LEVEL_TYPE_FILTERS.kanji);
        }
      }}
      onSetReviewTimingFilter={(timing) => {
        markHistoryPush();
        setSelectedSubjectId(null);
        setReviewTimingFilter(timing);
      }}
      onSetRecentOnly={(next) => {
        markHistoryPush();
        setSelectedSubjectId(null);
        setRecentOnly(next);
      }}
      onSetShowLocked={(next) => {
        if (forceShowLocked) {
          return;
        }

        markHistoryPush();
        setSelectedSubjectId(null);
        setShowLocked(next);
      }}
      onToggleShowEnglish={() => {
        if (!canToggleEnglish) {
          return;
        }
        onToggleShowEnglish?.();
      }}
      onSetSelectedSubjectId={setSelectedSubjectId}
      onJumpToRelatedSubject={actions.jumpToRelatedSubject}
      onJumpToKanji={actions.jumpToKanji}
      onMarkHistoryPush={markHistoryPush}
    />
  );
}
