import { useCallback, useState } from "react";
import { formatNumber } from "../lib/levelExplorerDisplay";
import { useLevelExplorerResetSelection } from "../lib/useLevelExplorerResetSelection";
import { useLevelExplorerKeyboardNav } from "../lib/useLevelExplorerKeyboardNav";
import { useLevelExplorerAutoLoadMore } from "../lib/useLevelExplorerAutoLoadMore";
import { LEVEL_JLPT_FILTERS, LEVEL_REVIEW_TIMING_FILTERS, LEVEL_SRS_FILTERS } from "../lib/levelExplorerState";
import ExplorerFilterToggleButton from "../../shared/ExplorerFilterToggleButton";
import ExplorerSplitLoadingShimmer from "../../shared/ExplorerSplitLoadingShimmer";
import LevelExplorerItemsGrid from "./LevelExplorerItemsGrid";
import LevelExplorerFilterPanel from "./LevelExplorerFilterPanel";
import LevelExplorerJlptMixSummary from "./LevelExplorerJlptMixSummary";
import { LEVEL_EXPLORER_TEXT } from "./LevelExplorer.constants";
import type { LevelExplorerContentProps as Props } from "./LevelExplorerContent.types";

export default function LevelExplorerContent({
  accountId,
  explorerTitle,
  onOpenStudySourceManager,
  levelOptions,
  levelItemCountsByLevel,
  selectedLevels,
  searchAvailableLevels,
  visibleTypes,
  counts,
  jlptCounts,
  reviewTimingCounts,
  accountPendingReviews,
  overdueOutsideSelectedLevels,
  selectedLevelList,
  filtersCollapsed,
  srsFilter,
  jlptFilter,
  reviewTimingFilter,
  recentOnly,
  showLocked,
  allowHideLocked,
  showEnglish,
  canToggleEnglish,
  studyMode,
  loading,
  gridColumns,
  searchMatchedSubjectIds,
  error,
  filteredItems,
  selectedItem,
  selectedMeaningExplanation,
  selectedReadingExplanationRaw,
  showReadingExplanation,
  hasPrimaryRelatedPanel,
  hasVisuallySimilarPanel,
  hasUsedInVocabularyPanel,
  vocabularyKanjiLinks,
  subjectById,
  onSelectAllLevelsAndClearSearch,
  onToggleLevel,
  onEnableAllTypes,
  onToggleTypeVisibility,
  onSetFiltersCollapsed,
  onSetSrsFilter,
  onSetJlptFilter,
  onSetReviewTimingFilter,
  onSetRecentOnly,
  onSetShowLocked,
  onToggleShowEnglish,
  onSetSelectedSubjectId,
  onJumpToRelatedSubject,
  onJumpToKanji,
  onMarkHistoryPush,
}: Props) {
  const [peekSubjectId, setPeekSubjectId] = useState<number | null>(null);
  const { sentinelRef, visibleItems } = useLevelExplorerAutoLoadMore(filteredItems, selectedItem);
  const selectedVisibleIndex = selectedItem
    ? visibleItems.findIndex((item) => item.subjectId === selectedItem.subjectId)
    : -1;
  const isPeekRevealed = studyMode && selectedItem !== null && peekSubjectId === selectedItem.subjectId;
  useLevelExplorerKeyboardNav({
    selectedItem,
    filteredItems,
    gridColumns,
    canToggleEnglish,
    onToggleShowEnglish,
    onMarkHistoryPush,
    onSetSelectedSubjectId,
    setPeekSubjectId,
  });
  const {
    selectedSubjectIds,
    isResetting,
    resetFeedback,
    toggleSubjectSelection,
    selectSubjectIds,
    selectVisibleSubjects,
    clearSelection,
    resetSelected,
    resetSingle,
  } = useLevelExplorerResetSelection({ filteredItems, visibleItems });
  const visibleDetailInsertIndex = selectedVisibleIndex >= 0
    ? Math.min(visibleItems.length - 1, Math.floor(selectedVisibleIndex / gridColumns) * gridColumns + (gridColumns - 1))
    : -1;
  const clearAllFilters = useCallback(() => {
    void onSelectAllLevelsAndClearSearch();
    onEnableAllTypes();
    onSetSrsFilter(LEVEL_SRS_FILTERS.all);
    onSetJlptFilter(LEVEL_JLPT_FILTERS.all);
    onSetReviewTimingFilter(LEVEL_REVIEW_TIMING_FILTERS.all);
    onSetRecentOnly(false);
    onSetShowLocked(!allowHideLocked);
    onSetSelectedSubjectId(null);
  }, [
    allowHideLocked,
    onEnableAllTypes,
    onSelectAllLevelsAndClearSearch,
    onSetJlptFilter,
    onSetRecentOnly,
    onSetReviewTimingFilter,
    onSetShowLocked,
    onSetSelectedSubjectId,
    onSetSrsFilter,
  ]);
  const mobileFilterSectionClass = filtersCollapsed ? "hidden" : "block";
  return (
    <>
    <section id="explorer" className="overflow-hidden rounded-2xl border border-line bg-surface/90 shadow-[0_20px_55px_rgba(8,16,36,0.12)]">
      <header className="flex flex-col gap-3 border-b border-line bg-surface/90 px-5 py-4">
        <div className="grid gap-2 sm:flex sm:items-start sm:justify-between sm:gap-3">
          <div className="order-2 min-w-0 sm:order-1">
            <button
              type="button"
              onClick={onOpenStudySourceManager}
              className="group inline-flex max-w-full cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-left"
              title="Change study library"
            >
              <h2 className="truncate text-xl font-black text-foreground underline decoration-dotted decoration-[1px] decoration-foreground/25 underline-offset-[0.18em] transition-[text-decoration-color] duration-150 group-hover:decoration-foreground/45 group-focus-visible:decoration-foreground/55" title={explorerTitle}>{explorerTitle}</h2>
              <span className="hidden rounded-full border border-line bg-surface px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-foreground/75 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100 sm:inline-flex">Change</span>
            </button>
            <p className="text-xs uppercase tracking-[0.08em] text-foreground/70">{LEVEL_EXPLORER_TEXT.levelSubtitle}</p>
          </div>
          <div className="order-1 flex items-center justify-end gap-2 sm:order-2 sm:justify-start">
            <ExplorerFilterToggleButton
              expanded={!filtersCollapsed}
              onToggle={() => onSetFiltersCollapsed(!filtersCollapsed)}
              controlsId="wk-filters-panel"
              showLabel="Show filters"
              hideLabel="Hide filters"
            />
          </div>
        </div>
        <div id="wk-filters-panel" className={`space-y-3 ${mobileFilterSectionClass}`}>
          <LevelExplorerFilterPanel
            levelOptions={levelOptions}
            levelItemCountsByLevel={levelItemCountsByLevel}
            selectedLevels={selectedLevels}
            searchAvailableLevels={searchAvailableLevels}
            visibleTypes={visibleTypes}
            counts={counts}
            jlptCounts={jlptCounts}
            reviewTimingCounts={reviewTimingCounts}
            accountPendingReviews={accountPendingReviews}
            overdueOutsideSelectedLevels={overdueOutsideSelectedLevels}
            srsFilter={srsFilter}
            jlptFilter={jlptFilter}
            reviewTimingFilter={reviewTimingFilter}
            onClearAllFilters={clearAllFilters}
            onSelectAllLevelsAndClearSearch={onSelectAllLevelsAndClearSearch}
            onToggleLevel={onToggleLevel}
            onEnableAllTypes={onEnableAllTypes}
            onToggleTypeVisibility={onToggleTypeVisibility}
            onSetSrsFilter={onSetSrsFilter}
            onSetJlptFilter={onSetJlptFilter}
            onSetReviewTimingFilter={onSetReviewTimingFilter}
          />
        </div>
      </header>
      <LevelExplorerJlptMixSummary
        jlptCounts={jlptCounts}
        className={`border-b border-line px-5 py-4 ${mobileFilterSectionClass}`}
      />
    </section>
    <section className="mt-3 overflow-hidden rounded-2xl border border-line bg-surface/90 shadow-[0_20px_55px_rgba(8,16,36,0.12)]">
      {loading ? (
        <div className="px-5 py-4">
          <ExplorerSplitLoadingShimmer label="Loading level data..." cardCount={8} />
        </div>
      ) : null}
      {searchMatchedSubjectIds ? (
        <p className="px-5 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-foreground/70">
          Showing {formatNumber(searchMatchedSubjectIds.size)} search result{searchMatchedSubjectIds.size === 1 ? "" : "s"}
        </p>
      ) : null}
      {error ? <p className="px-5 py-4 text-sm text-red-700">{error}</p> : null}
      <div className="p-5">
        <LevelExplorerItemsGrid
          accountId={accountId}
          filteredItems={filteredItems}
          visibleItems={visibleItems}
          selectedItem={selectedItem}
          visibleDetailInsertIndex={visibleDetailInsertIndex}
          selectedLevelList={selectedLevelList}
          studyMode={studyMode}
          showEnglish={showEnglish}
          canToggleEnglish={canToggleEnglish}
          isPeekRevealed={isPeekRevealed}
          selectedMeaningExplanation={selectedMeaningExplanation}
          selectedReadingExplanationRaw={selectedReadingExplanationRaw}
          showReadingExplanation={showReadingExplanation}
          hasPrimaryRelatedPanel={hasPrimaryRelatedPanel}
          hasVisuallySimilarPanel={hasVisuallySimilarPanel}
          hasUsedInVocabularyPanel={hasUsedInVocabularyPanel}
          vocabularyKanjiLinks={vocabularyKanjiLinks}
          subjectById={subjectById}
          selectedSubjectIds={selectedSubjectIds}
          isResetting={isResetting}
          resetFeedback={resetFeedback}
          recentOnly={recentOnly}
          showLocked={showLocked}
          allowHideLocked={allowHideLocked}
          sentinelRef={sentinelRef}
          onClearFilters={clearAllFilters}
          onSelectItem={(subjectId) => {
            onMarkHistoryPush();
            onSetSelectedSubjectId((prev) => (prev === subjectId ? null : subjectId));
            setPeekSubjectId(null);
          }}
          onTogglePeek={(subjectId) => {
            setPeekSubjectId((prev) => (prev === subjectId ? null : subjectId));
          }}
          onSetRecentOnly={onSetRecentOnly}
          onSetShowLocked={onSetShowLocked}
          onToggleShowEnglish={onToggleShowEnglish}
          onToggleSubjectSelection={toggleSubjectSelection}
          onSelectSubjectIds={selectSubjectIds}
          onSelectVisibleSubjects={selectVisibleSubjects}
          onClearSelection={clearSelection}
          onResetSelected={resetSelected}
          onResetSingle={resetSingle}
          onJumpToRelatedSubject={onJumpToRelatedSubject}
          onJumpToKanji={onJumpToKanji}
        />
      </div>
    </section>
    </>
  );
}
