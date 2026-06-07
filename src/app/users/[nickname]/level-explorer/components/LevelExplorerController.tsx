"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import LevelExplorerContent from "./LevelExplorerContent";
import type { Snapshot, SrsFilter } from "../../explorerTypes";
import { stripHtml } from "../lib/levelExplorerDisplay";
import { buildLevelExplorerActions } from "../lib/levelExplorerControllerActions";
import { buildLevelExplorerControllerHandlers } from "../lib/levelExplorerControllerHandlers";
import {
  useLevelExplorerGridColumns,
  useLevelExplorerSearchEvents,
  useLevelExplorerSelectionReconcile,
  useLevelExplorerStorageHydration,
  useLevelExplorerStoragePersistence,
  useLevelExplorerUrlHydration,
} from "../lib/levelExplorerControllerEffects";
import {
  buildLevelExplorerStorageKeys,
  LEVEL_JLPT_FILTERS,
  LEVEL_REVIEW_TIMING_FILTERS,
  LEVEL_SRS_FILTERS,
  LEVEL_TYPE_FILTERS,
  type JlptFilter,
  type ReviewTimingFilter,
  type TypeFilter,
} from "../lib/levelExplorerState";
import {
  buildCombinedSnapshot,
  computeJlptCounts,
  computeLevelItemCounts,
  computeReviewTimingCounts,
  filterAndSortLevelItems,
} from "../lib/levelExplorerSelectors";
import {
  buildKanjiByCharacter,
  buildSubjectById,
  buildVocabularyKanjiLinks,
} from "../lib/levelExplorerItemDetails";
import {
  snapshotHasComponentKanjiData,
  snapshotHasJlptMetaData,
  normalizeSnapshot,
} from "../lib/levelExplorerSnapshotUtils";
import { isVocabularySubjectType } from "../lib/levelExplorerDomain";

type Props = {
  accountId: string;
  isActive?: boolean;
  explorerTitle: string;
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
  const storageKeys = useMemo(() => buildLevelExplorerStorageKeys(accountId), [accountId]);

  const initialClientState = useMemo(
    () => ({
      selectedLevels: new Set<number>([initialSnapshot.level]),
      srsFilter: initialSrsFilter,
      typeFilter: LEVEL_TYPE_FILTERS.all as TypeFilter,
      jlptFilter: LEVEL_JLPT_FILTERS.all as JlptFilter,
      reviewTimingFilter: LEVEL_REVIEW_TIMING_FILTERS.all as ReviewTimingFilter,
      recentOnly: false,
      stickyMerge: false,
      selectedSubjectId: initialSnapshot.items[0]?.subjectId ?? null,
      visibleTypes: { radical: true, kanji: true, vocabulary: true },
      filtersCollapsed: false,
      showLocked: false,
    }),
    [initialSnapshot.items, initialSnapshot.level, initialSrsFilter],
  );

  const [selectedLevels, setSelectedLevels] = useState<Set<number>>(initialClientState.selectedLevels);
  const [snapshotsByLevel, setSnapshotsByLevel] = useState<Map<number, Snapshot>>(
    new Map([[initialSnapshot.level, normalizeSnapshot(initialSnapshot)]]),
  );
  const [srsFilter, setSrsFilter] = useState<SrsFilter>(initialClientState.srsFilter);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(initialClientState.typeFilter);
  const [jlptFilter, setJlptFilter] = useState<JlptFilter>(initialClientState.jlptFilter);
  const [reviewTimingFilter, setReviewTimingFilter] = useState<ReviewTimingFilter>(initialClientState.reviewTimingFilter);
  const [recentOnly, setRecentOnly] = useState(initialClientState.recentOnly);
  const [showLocked, setShowLocked] = useState(initialClientState.showLocked);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(initialClientState.selectedSubjectId);
  const [visibleTypes, setVisibleTypes] = useState(initialClientState.visibleTypes);
  const [stickyMerge, setStickyMerge] = useState(initialClientState.stickyMerge);
  const [filtersCollapsed, setFiltersCollapsed] = useState(initialClientState.filtersCollapsed);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchMatchedSubjectIds, setSearchMatchedSubjectIds] = useState<Set<number> | null>(null);
  const [searchAvailableLevels, setSearchAvailableLevels] = useState<Set<number> | null>(null);
  const [gridColumns, setGridColumns] = useState(1);
  const [pendingHistoryMode, setPendingHistoryMode] = useState<"replace" | "push">("replace");

  const applyingUrlStateRef = useRef(false);
  const hasHydratedUrlStateRef = useRef(false);
  const lastHandledFindQueryRef = useRef("");

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
  }, []);

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

  const combinedSnapshot = useMemo(
    () => buildCombinedSnapshot(selectedLevels, snapshotsByLevel, normalizeSnapshot(initialSnapshot)),
    [initialSnapshot, selectedLevels, snapshotsByLevel],
  );

  const levelItemCountsByLevelEffective = useMemo(() => {
    const merged = { ...levelItemCountsByLevel };
    for (const [level, snapshot] of snapshotsByLevel.entries()) {
      merged[level] = snapshot.items.length;
    }
    return merged;
  }, [levelItemCountsByLevel, snapshotsByLevel]);

  const filteredItems = useMemo(
    () =>
      filterAndSortLevelItems(combinedSnapshot.items, {
        recentOnly,
        showLocked,
        srsFilter,
        typeFilter,
        jlptFilter,
        reviewTimingFilter,
        visibleTypes,
        searchMatchedSubjectIds,
      }),
    [
      combinedSnapshot.items,
      recentOnly,
      showLocked,
      srsFilter,
      typeFilter,
      jlptFilter,
      reviewTimingFilter,
      visibleTypes,
      searchMatchedSubjectIds,
    ],
  );

  const selectedItem = filteredItems.find((item) => item.subjectId === selectedSubjectId) ?? null;
  const selectedItemFromAll =
    selectedSubjectId === null ? null : combinedSnapshot.items.find((item) => item.subjectId === selectedSubjectId) ?? null;

  const counts = useMemo(() => computeLevelItemCounts(combinedSnapshot.items), [combinedSnapshot.items]);
  const jlptCounts = useMemo(() => computeJlptCounts(combinedSnapshot.items), [combinedSnapshot.items]);
  const reviewTimingCounts = useMemo(
    () => computeReviewTimingCounts(combinedSnapshot.items),
    [combinedSnapshot.items],
  );
  const overdueOutsideSelectedLevels = Math.max(0, accountPendingReviews - reviewTimingCounts.overdue);
  const selectedLevelList = Array.from(selectedLevels.values()).sort((a, b) => a - b);
  const subjectById = useMemo(() => buildSubjectById(combinedSnapshot.items), [combinedSnapshot.items]);
  const kanjiByCharacter = useMemo(() => buildKanjiByCharacter(combinedSnapshot.items), [combinedSnapshot.items]);

  const vocabularyKanjiLinks = useMemo(
    () => buildVocabularyKanjiLinks(selectedItem, subjectById, kanjiByCharacter),
    [selectedItem, subjectById, kanjiByCharacter],
  );

  const hasPrimaryRelatedPanel = selectedItem
    ? isVocabularySubjectType(selectedItem.subjectType)
      ? vocabularyKanjiLinks.length > 0
      : (selectedItem.radicals?.length ?? 0) > 0
    : false;
  const hasVisuallySimilarPanel = (selectedItem?.visuallySimilar?.length ?? 0) > 0;
  const hasUsedInVocabularyPanel = (selectedItem?.usedInVocabulary?.length ?? 0) > 0;
  const selectedMeaningExplanation = stripHtml(selectedItem?.meaningExplanation) || "-";
  const selectedReadingExplanationRaw = stripHtml(selectedItem?.readingExplanation);
  const showReadingExplanation = selectedReadingExplanationRaw.length > 0;

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

  useLevelExplorerUrlHydration({
    maxLevel,
    initialLevel: initialSnapshot.level,
    ensureLevelLoaded: (level) => ensureLevelLoaded(level),
    applyingUrlStateRef,
    hasHydratedUrlStateRef,
    setSelectedLevels,
    setSelectedSubjectId,
    setSrsFilter,
    setTypeFilter,
    setJlptFilter,
    setReviewTimingFilter,
    setRecentOnly,
    setStickyMerge,
    skipInitialApply: false,
  });

  useLevelExplorerStorageHydration({
    storageKeys,
    setVisibleTypes,
    setSelectedSubjectId,
    setStickyMerge,
    setFiltersCollapsed,
    setSrsFilter,
    setTypeFilter,
    setJlptFilter,
    setReviewTimingFilter,
    setRecentOnly,
    setShowLocked,
  });

  useEffect(() => {
    if (!isActive) {
      return;
    }

    if (!hasHydratedUrlStateRef.current) {
      return;
    }

    // Allow explicit user actions (push mode) to update URL even if hydration is still settling.
    if (applyingUrlStateRef.current && pendingHistoryMode !== "push") {
      return;
    }

    writeUrlState();
  }, [
    isActive,
    pendingHistoryMode,
    selectedLevels,
    selectedSubjectId,
    srsFilter,
    typeFilter,
    jlptFilter,
    reviewTimingFilter,
    stickyMerge,
    writeUrlState,
  ]);

  useLevelExplorerGridColumns(setGridColumns);

  useLevelExplorerStoragePersistence({
    storageKeys,
    srsFilter,
    typeFilter,
    jlptFilter,
    reviewTimingFilter,
    recentOnly,
    showLocked,
    selectedSubjectId,
  });

  useEffect(() => {
    const current = snapshotsByLevel.get(initialSnapshot.level);
    if (current && (!snapshotHasComponentKanjiData(current) || !snapshotHasJlptMetaData(current))) {
      void ensureLevelLoaded(initialSnapshot.level, true);
    }
  }, [ensureLevelLoaded, initialSnapshot.level, snapshotsByLevel]);

  useLevelExplorerSelectionReconcile({
    selectedItem,
    selectedItemFromAll,
    typeFilter,
    visibleTypes,
    srsFilter,
    jlptFilter,
    reviewTimingFilter,
    hasHydratedUrlStateRef,
    setTypeFilter,
    setVisibleTypesAndPersist,
    setSrsFilter,
    setJlptFilter,
    setReviewTimingFilter,
  });

  useLevelExplorerSearchEvents({
    searchAndReveal: actions.searchAndReveal,
    setSearchMatchedSubjectIds,
    setSearchAvailableLevels,
    lastHandledFindQueryRef,
  });

  return (
    <LevelExplorerContent
      accountId={accountId}
      explorerTitle={explorerTitle}
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
