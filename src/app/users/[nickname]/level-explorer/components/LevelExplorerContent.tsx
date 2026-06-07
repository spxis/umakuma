import { useCallback, useEffect, useRef, useState } from "react";
import { allBadgeClass, badgeClass, disabledBadgeClass, formatNumber, srsFilterButtonLabel } from "../lib/levelExplorerDisplay";
import { useLevelExplorerResetSelection } from "../lib/useLevelExplorerResetSelection";
import { JLPT_FILTER_ALLOWED, LEVEL_JLPT_FILTERS, LEVEL_REVIEW_TIMING_FILTERS, LEVEL_SRS_FILTERS, REVIEW_TIMING_ALLOWED, SRS_FILTER_ALLOWED } from "../lib/levelExplorerState";
import ExplorerSearchBar from "../../ExplorerSearchBar";
import ExplorerFilterToggleButton from "../../shared/ExplorerFilterToggleButton";
import FilterChipLabel from "../../shared/FilterChipLabel";
import LevelExplorerItemsGrid from "./LevelExplorerItemsGrid";
import { LEVEL_EXPLORER_JLPT_FILTER_LABELS, LEVEL_EXPLORER_JLPT_MIX_LEVELS, LEVEL_EXPLORER_REVIEW_TIMING_LABELS } from "./LevelExplorer.constants";
import type { LevelExplorerContentProps as Props } from "./LevelExplorerContent.types";
function wkStatusToneClass(status: (typeof SRS_FILTER_ALLOWED)[number], active: boolean): string {
  if (status === LEVEL_SRS_FILTERS.apprentice) {
    return active ? "border-pink-300 bg-pink-100 text-pink-700" : "border-pink-200 bg-pink-50/70 text-pink-700 hover:bg-pink-100";
  }
  if (status === LEVEL_SRS_FILTERS.guru) {
    return active ? "border-violet-300 bg-violet-100 text-violet-700" : "border-violet-200 bg-violet-50/70 text-violet-700 hover:bg-violet-100";
  }
  if (status === LEVEL_SRS_FILTERS.master) {
    return active ? "border-sky-300 bg-sky-100 text-sky-700" : "border-sky-200 bg-sky-50/70 text-sky-700 hover:bg-sky-100";
  }
  if (status === LEVEL_SRS_FILTERS.enlightened) {
    return active ? "border-amber-300 bg-amber-100 text-amber-700" : "border-amber-200 bg-amber-50/70 text-amber-700 hover:bg-amber-100";
  }
  return active ? "border-line bg-surface-muted text-foreground" : "border-line bg-surface text-foreground/75 hover:bg-surface-muted";
}

export default function LevelExplorerContent({
  accountId,
  explorerTitle,
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
  const PAGE_SIZE = 40;
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [peekSubjectId, setPeekSubjectId] = useState<number | null>(null);
  const selectedItemIndex = selectedItem
    ? filteredItems.findIndex((item) => item.subjectId === selectedItem.subjectId)
    : -1;
  const effectiveVisibleCount = Math.min(
    filteredItems.length,
    Math.max(PAGE_SIZE, visibleCount, selectedItemIndex + 1),
  );
  useEffect(() => {
    if (!sentinelRef.current) {
      return;
    }
    if (effectiveVisibleCount >= filteredItems.length) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) {
          return;
        }
        setVisibleCount((prev) => Math.min(filteredItems.length, prev + PAGE_SIZE));
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [effectiveVisibleCount, filteredItems.length]);
  const visibleItems = filteredItems.slice(0, effectiveVisibleCount);
  const selectedVisibleIndex = selectedItem
    ? visibleItems.findIndex((item) => item.subjectId === selectedItem.subjectId)
    : -1;
  const isPeekRevealed = studyMode && selectedItem !== null && peekSubjectId === selectedItem.subjectId;
  useEffect(() => {
    if (!selectedItem) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "e" && canToggleEnglish) {
        event.preventDefault();
        onToggleShowEnglish();
        return;
      }
      if (key === " " || event.code === "Space") {
        event.preventDefault();
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        onMarkHistoryPush();
        onSetSelectedSubjectId(null);
        setPeekSubjectId(null);
        return;
      }
      if (key === "escape") {
        event.preventDefault();
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        onMarkHistoryPush();
        onSetSelectedSubjectId(null);
        setPeekSubjectId(null);
        return;
      }
      const columns = Math.max(1, gridColumns);
      const delta =
        key === "l" || key === "a" || event.key === "ArrowLeft"
          ? -1
          : key === "r" || key === "d" || event.key === "ArrowRight"
            ? 1
            : key === "w" || event.key === "ArrowUp"
              ? -columns
              : key === "s" || event.key === "ArrowDown"
                ? columns
                : null;
      if (delta === null) {
        return;
      }
      const currentIndex = filteredItems.findIndex((item) => item.subjectId === selectedItem.subjectId);
      if (currentIndex < 0) {
        return;
      }
      const nextIndex = currentIndex + delta;
      if (nextIndex < 0 || nextIndex >= filteredItems.length) {
        return;
      }
      if (nextIndex === currentIndex) {
        return;
      }
      const nextItem = filteredItems[nextIndex];
      if (!nextItem) {
        return;
      }
      const currentRow = Math.floor(currentIndex / columns);
      const nextRow = Math.floor(nextIndex / columns);
      const movedToDifferentRow = currentRow !== nextRow;
      event.preventDefault();
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      onMarkHistoryPush();
      onSetSelectedSubjectId(nextItem.subjectId);
      setPeekSubjectId(null);
      if (movedToDifferentRow) {
        window.requestAnimationFrame(() => {
          const nextCard = document.querySelector<HTMLElement>(
            `[data-explorer-card-subject-id="${nextItem.subjectId}"]`,
          );
          if (!nextCard) {
            return;
          }
          const topOffset = 112;
          const targetTop = window.scrollY + nextCard.getBoundingClientRect().top - topOffset;
          window.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
        });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [canToggleEnglish, filteredItems, gridColumns, onMarkHistoryPush, onSetSelectedSubjectId, onToggleShowEnglish, selectedItem]);
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
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-foreground">{explorerTitle}</h2>
            <p className="text-xs uppercase tracking-[0.08em] text-foreground/70">Select one level at a time</p>
          </div>
          <ExplorerFilterToggleButton
            expanded={!filtersCollapsed}
            onToggle={() => onSetFiltersCollapsed(!filtersCollapsed)}
            controlsId="wk-filters-panel"
            showLabel="Show filters"
            hideLabel="Hide filters"
          />
        </div>
        <div id="wk-filters-panel" className={`space-y-3 ${mobileFilterSectionClass}`}>
          <div className="rounded-2xl border border-line bg-surface px-3 py-3 shadow-[0_8px_18px_rgba(8,16,36,0.06)]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-foreground/70">Filters</p>
              <div className="w-full md:w-1/2">
                <ExplorerSearchBar scope="level" />
              </div>
            </div>
            <div className="mt-2 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex max-w-full items-start gap-1 rounded-xl border border-line bg-surface px-1.5 py-1" role="tablist" aria-label="Level filters">
                <span className="inline-flex h-7 items-center px-2 text-xs font-bold uppercase tracking-[0.1em] text-foreground/70">Level</span>
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                  <button
                    type="button"
                    onClick={() => { void onSelectAllLevelsAndClearSearch(); }}
                    role="tab"
                    aria-selected={selectedLevels.size === levelOptions.length}
                    className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] ${badgeClass(selectedLevels.size === levelOptions.length)}`}
                  >
                    <FilterChipLabel label="All" count={counts.all} />
                  </button>
                  {levelOptions.map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => { void onToggleLevel(level); }}
                      disabled={searchAvailableLevels !== null && !searchAvailableLevels.has(level)}
                      role="tab"
                      aria-selected={selectedLevels.has(level)}
                      className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] ${badgeClass(selectedLevels.has(level))}`}
                    >
                      <FilterChipLabel label={level} count={levelItemCountsByLevel[level] ?? 0} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid gap-2">
          <div className="inline-flex max-w-full items-start gap-1 rounded-xl border border-line bg-surface px-1.5 py-1" role="tablist" aria-label="Grouping filters">
            <span className="inline-flex h-7 items-center px-2 text-xs font-bold uppercase tracking-[0.1em] text-foreground/70">Grouping</span>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={onEnableAllTypes}
                role="tab"
                aria-selected={visibleTypes.radical && visibleTypes.kanji && visibleTypes.vocabulary}
                className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] ${badgeClass(visibleTypes.radical && visibleTypes.kanji && visibleTypes.vocabulary)}`}
              >
                <FilterChipLabel label="All" count={counts.all} />
              </button>
              {([
                ["radical", "RADICAL", counts.radical],
                ["kanji", "KANJI", counts.kanji],
                ["vocabulary", "VOCAB", counts.vocabulary],
              ] as const).map(([type, label, count]) => {
                const active = (visibleTypes.radical && visibleTypes.kanji && visibleTypes.vocabulary) || visibleTypes[type];
                const disabled = count === 0 && !active;
                const tone = type === "radical"
                  ? (active ? "border-radical bg-radical text-white" : "border-radical/50 bg-radical/10 text-radical hover:bg-radical/20")
                  : type === "kanji"
                    ? (active ? "border-kanji bg-kanji text-white" : "border-kanji/50 bg-kanji/10 text-kanji hover:bg-kanji/20")
                    : (active ? "border-vocabulary bg-vocabulary text-white" : "border-vocabulary/50 bg-vocabulary/10 text-vocabulary hover:bg-vocabulary/20");
                if (disabled) return null;
                return (
                  <button key={type} type="button" onClick={() => onToggleTypeVisibility(type)} disabled={disabled} role="tab" aria-selected={active} className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] ${disabled ? disabledBadgeClass() : tone}`}>
                    <FilterChipLabel label={label} count={count} />
                  </button>
                );
              })}
            </div>
          </div>
          <div className="inline-flex max-w-full items-start gap-1 rounded-xl border border-line bg-surface px-1.5 py-1" role="tablist" aria-label="Status filters">
            <span className="inline-flex h-7 items-center px-2 text-xs font-bold uppercase tracking-[0.1em] text-foreground/70">Status</span>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
              {SRS_FILTER_ALLOWED.map((status) => {
                const count = counts[status];
                const disabled = status !== LEVEL_SRS_FILTERS.all && count === 0;
                const active = srsFilter === status;
                if (disabled && !active) return null;
                return (
                  <button key={status} type="button" onClick={() => onSetSrsFilter(status)} disabled={disabled} className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] ${disabled ? disabledBadgeClass() : status === LEVEL_SRS_FILTERS.all ? badgeClass(active) : wkStatusToneClass(status, active)}`}>
                    <FilterChipLabel label={srsFilterButtonLabel(status)} count={count} />
                  </button>
                );
              })}
            </div>
          </div>
          <div className="inline-flex max-w-full items-start gap-1 rounded-xl border border-line bg-surface px-1.5 py-1" role="tablist" aria-label="JLPT mix filters">
            <span className="inline-flex h-7 items-center px-2 text-xs font-bold uppercase tracking-[0.1em] text-foreground/70">JLPT</span>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
              {JLPT_FILTER_ALLOWED.map((level) => {
                const count = level === LEVEL_JLPT_FILTERS.all ? counts.all : jlptCounts[level];
                const disabled = level !== LEVEL_JLPT_FILTERS.all && count === 0;
                const isJlptLevel = level !== LEVEL_JLPT_FILTERS.all && level !== LEVEL_JLPT_FILTERS.none;
                const active = jlptFilter === level;
                const jlptStyle = active
                  ? "border-teal-500 bg-teal-500 text-white"
                  : "border-teal-300 bg-teal-100 text-teal-800 hover:bg-teal-200";
                if (disabled && !active) {
                  return null;
                }
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => onSetJlptFilter(level)}
                    disabled={disabled}
                    className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] ${disabled ? disabledBadgeClass() : isJlptLevel ? jlptStyle : level === LEVEL_JLPT_FILTERS.all ? badgeClass(active) : allBadgeClass(active)}`}
                  >
                    <FilterChipLabel label={LEVEL_EXPLORER_JLPT_FILTER_LABELS[level]} count={count} />
                  </button>
                );
              })}
            </div>
          </div>
          <div className="inline-flex max-w-full items-start gap-1 rounded-xl border border-line bg-surface px-1.5 py-1" role="tablist" aria-label="Review timing filters">
            <span className="inline-flex h-7 items-center px-2 text-xs font-bold uppercase tracking-[0.1em] text-foreground/70">Timing</span>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
              {REVIEW_TIMING_ALLOWED.map((timing) => {
                const label = LEVEL_EXPLORER_REVIEW_TIMING_LABELS[timing];
                const count = timing === LEVEL_REVIEW_TIMING_FILTERS.all ? counts.all : reviewTimingCounts[timing];
                const disabled = timing !== LEVEL_REVIEW_TIMING_FILTERS.all && count === 0;
                const active = reviewTimingFilter === timing;
                if (disabled && !active) {
                  return null;
                }
                return (
                  <button
                    key={timing}
                    type="button"
                    onClick={() => onSetReviewTimingFilter(timing)}
                    disabled={disabled}
                    className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] ${disabled ? disabledBadgeClass() : badgeClass(active)}`}
                  >
                    <FilterChipLabel label={label} count={count} />
                  </button>
                );
              })}
            </div>
          </div>
          {reviewTimingFilter === LEVEL_REVIEW_TIMING_FILTERS.overdue && overdueOutsideSelectedLevels > 0 ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-foreground/55">
              Showing {formatNumber(reviewTimingCounts.overdue)} overdue in selected levels, with {formatNumber(overdueOutsideSelectedLevels)} more overdue in other levels
              <span className="ml-1 text-[11px] font-semibold text-current/80">({formatNumber(accountPendingReviews)} total pending reviews)</span>.
            </p>
          ) : null}
            </div>
            </div>
        </div>
        </div>
      </header>
      <div className={`border-b border-line px-5 py-4 ${mobileFilterSectionClass}`}>
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-foreground/70">JLPT mix (kanji in selected levels)</p>
        <div className="mt-2 grid grid-cols-5 gap-2">
          {LEVEL_EXPLORER_JLPT_MIX_LEVELS.map((level) => {
            const label = LEVEL_EXPLORER_JLPT_FILTER_LABELS[level];
            const count = jlptCounts[level];
            return (
              <div key={level} className="rounded-xl border border-line bg-surface-muted p-2 text-center">
                <p className="text-[10px] font-bold uppercase text-foreground/70">{label}</p>
                <p className="text-2xl font-black text-foreground">{formatNumber(count)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
    <section className="mt-3 overflow-hidden rounded-2xl border border-line bg-surface/90 shadow-[0_20px_55px_rgba(8,16,36,0.12)]">
      {loading ? <p className="px-5 py-4 text-sm text-foreground/70">Loading level data...</p> : null}
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
