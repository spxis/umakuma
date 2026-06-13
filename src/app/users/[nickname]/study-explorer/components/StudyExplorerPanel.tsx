import { useState } from "react";
import ExplorerBulkSelectionPanel from "../../shared/ExplorerBulkSelectionPanel";
import UnifiedExplorerCard from "../../shared/UnifiedExplorerCard";
import ExplorerSearchBar from "../../ExplorerSearchBar";
import StudyFilterSection from "./StudyFilterSection";
import StudyLevelFilters from "./StudyLevelFilters";
import StudyStatusFilters from "./StudyStatusFilters";
import StudyUpcomingReviewsSection from "./StudyUpcomingReviewsSection";
import {
  isAllStudyTypeFilter,
  isLessonLockedQueueItem,
  isReviewQueueItem,
  STUDY_PANEL_TEXT,
  STUDY_QUEUE_TYPES,
  STUDY_GROUPING_FILTERS,
  STUDY_TYPE_FILTERS,
  studyGroupingToneClass,
} from "./StudyExplorer.constants";
import {
  formatNextReviewBadge,
  formatNumber,
  glyphSubtitleForDisplay,
  glyphTextSizeClass,
  jlptLevelPillClass,
  shortSubjectTypeLabel,
  statusClass,
  statusShortLabel,
  subjectTypePillClass,
  titleForDisplay,
  typeCardClass,
  typeGlyphBoxClass,
} from "../../level-explorer/lib/levelExplorerDisplay";
import type { StudyExplorerPanelProps } from "./StudyExplorerPanel.types";
import { useStudyMobileFilterSections } from "./useStudyMobileFilterSections";
import { useStudyBulkReset } from "../lib/useStudyBulkReset";
import { badgeClass, disabledBadgeClass } from "../lib/studyExplorerUtils";
import ExplorerFilterToggleButton from "../../shared/ExplorerFilterToggleButton";
import FilterChipLabel from "../../shared/FilterChipLabel";
import { usePersistedBoolean } from "@/lib/usePersistedBoolean";
import { useGlyphFontPreference } from "@/lib/glyphFontPreference";
export default function StudyExplorerPanel({
  canToggleEnglish,
  showEnglish,
  studyMode,
  studySourceHeaderLabel,
  studySourceIsCustom,
  studySourceLevel,
  levelOptions,
  availableLevels,
  reviewLevelCounts,
  viewedLevel,
  typeFilter,
  srsFilter,
  srsStageFilter,
  queueMode,
  lessonLevelCounts,
  typeCounts,
  srsCounts,
  srsStageCounts,
  filteredItems,
  totalItems,
  hasMorePages,
  isLoadingMore,
  loadMoreError,
  isLoading,
  isValidating,
  hasData,
  isUnauthorized,
  errorMessage,
  showUpcomingReviews,
  upcomingItems,
  isLoadingUpcomingReviews,
  upcomingErrorMessage,
  showLocked,
  waitSortOrder,
  gridColumns,
  cacheFooterText,
  cacheFooterTitle,
  sentinelRef,
  onSetViewedLevel,
  onSetTypeFilter,
  onSetSrsFilter,
  onSetSrsStageFilter,
  onToggleShowEnglish,
  onToggleShowLocked,
  onToggleShowUpcomingReviews,
  onOpenStudySourceManager,
  onSetWaitSortOrder,
  onSelectSubject,
  onClearAllFilters,
}: StudyExplorerPanelProps) {
  const {
    bulkModeEnabled,
    selectedSubjectIds,
    selectedItems,
    selectedPreview,
    applyBulkSelection,
    toggleBulkMode,
    setSelectedSubjectIds,
  } = useStudyBulkReset({ filteredItems });
  const [showAllSelectedInBar, setShowAllSelectedInBar] = useState(false);
  const [filtersOpen, setFiltersOpen] = usePersistedBoolean("wr:study:filters-open", {
    defaultValue: true,
  });
  const { sectionsOpen: mobileFilterSectionsOpen, toggleSection: toggleMobileFilterSection, setSectionOpen: setMobileFilterSectionOpen } = useStudyMobileFilterSections();
  const filtersLoading = !hasData;
  const showLoadingIndicator = (isLoading || isValidating || !hasData) && filteredItems.length === 0 && !errorMessage;
  const showTypeCountPlaceholders = !hasData && typeCounts.all === 0 && filteredItems.length === 0 && !errorMessage;
  const displayErrorMessage = errorMessage === "Failed to fetch" ? STUDY_PANEL_TEXT.queueRefreshError : errorMessage;
  const lessonLevelOptions = Object.entries(lessonLevelCounts)
    .map(([level, count]) => [Number(level), count] as const)
    .filter(([, count]) => count > 0)
    .sort((a, b) => a[0] - b[0]);
  const totalReviewsInVisibleLevels = Object.values(reviewLevelCounts).reduce((sum, count) => sum + count, 0);
  const totalLessonsInVisibleLevels = lessonLevelOptions.reduce((sum, [, count]) => sum + count, 0);
  const allTypeCount = queueMode === STUDY_QUEUE_TYPES.lesson ? (viewedLevel === null ? totalItems : (lessonLevelCounts[viewedLevel] ?? typeCounts.all)) : typeCounts.all;
  const studyLevelHeaderLabel = `L${Math.max(1, studySourceLevel ?? 1)}`;
  const studyHeaderLabel = `Study - ${studySourceHeaderLabel} (${studyLevelHeaderLabel})`;
  const hasMoreMatchingItems = hasMorePages && filteredItems.length < allTypeCount;
  const showFilterPagingState = queueMode === STUDY_QUEUE_TYPES.lesson && viewedLevel !== null && hasMoreMatchingItems && filteredItems.length === 0;
  const hideControlsDuringInitialLoad = (showLoadingIndicator || showFilterPagingState) && filteredItems.length === 0;
  const { toggle: toggleGlyphFont } = useGlyphFontPreference();
  const showLoadingOverlay = hideControlsDuringInitialLoad;
  const loadingFillCount = hasMoreMatchingItems && isLoadingMore && gridColumns > 1
    ? (gridColumns - (filteredItems.length % gridColumns)) % gridColumns
    : 0;
  const allTypesSelected = isAllStudyTypeFilter(typeFilter);
  const groupingCountLabel = (count: number) => showTypeCountPlaceholders ? "-" : formatNumber(count);
  const mobileFilterSectionClass = hideControlsDuringInitialLoad
    ? "hidden"
    : filtersOpen
      ? "block"
      : "hidden";
  const openAllMobileFilterSections = () => { setMobileFilterSectionOpen("level", true); setMobileFilterSectionOpen("grouping", true); setMobileFilterSectionOpen("status", true); };
  const handleResetFilters = () => { onClearAllFilters(); setFiltersOpen(true); openAllMobileFilterSections(); };
  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-line bg-surface/90 shadow-[0_20px_55px_rgba(8,16,36,0.12)]">
      <header className="border-b border-line bg-surface/90 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={onOpenStudySourceManager}
              className="group inline-flex max-w-full items-center gap-2 rounded-md px-1 py-0.5 text-left"
              title={studySourceIsCustom ? "Change study library" : "Choose study library"}
            >
              <h2 className="truncate text-xl font-black text-foreground" title={studyHeaderLabel}>{studyHeaderLabel}</h2>
              <span className="hidden rounded-full border border-line bg-surface px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-foreground/75 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100 sm:inline-flex">Change</span>
            </button>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/50 sm:hidden">{studySourceIsCustom ? "Tap title to change library" : "Tap title to choose library"}</p>
            <p className="hidden text-xs uppercase tracking-[0.08em] text-foreground/70 sm:block">{STUDY_PANEL_TEXT.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <ExplorerFilterToggleButton
              expanded={filtersOpen}
              onToggle={() => setFiltersOpen((open) => !open)}
              controlsId="study-filters-panel"
              showLabel={STUDY_PANEL_TEXT.showFilters}
              hideLabel={STUDY_PANEL_TEXT.hideFilters}
            />
          </div>
        </div>
        <div id="study-filters-panel" className={`mt-3 rounded-2xl border border-line bg-surface px-3 py-3 shadow-[0_8px_18px_rgba(8,16,36,0.06)] ${mobileFilterSectionClass}`}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-foreground/70">Filters</p>
            <div className="w-full md:w-1/2">
              <ExplorerSearchBar scope={STUDY_PANEL_TEXT.searchScope} />
            </div>
          </div>
          <div className="mt-2 space-y-2">
          <StudyLevelFilters
            queueMode={queueMode}
            filtersLoading={filtersLoading}
            viewedLevel={viewedLevel}
            levelOptions={levelOptions}
            lessonLevelOptions={lessonLevelOptions}
            availableLevels={availableLevels}
            reviewLevelCounts={reviewLevelCounts}
            totalLessonsInVisibleLevels={totalLessonsInVisibleLevels}
            totalReviewsInVisibleLevels={totalReviewsInVisibleLevels}
            mobileShowAllOptions={mobileFilterSectionsOpen.level}
            onToggleMobileShowAllOptions={() => toggleMobileFilterSection("level")}
            onSetViewedLevel={(level) => { setMobileFilterSectionOpen("level", false); onSetViewedLevel(level); }}
          />
          <StudyFilterSection
            title="Grouping"
            isOpen={mobileFilterSectionsOpen.grouping}
            onToggle={() => toggleMobileFilterSection("grouping")}
            ariaLabel="Grouping filters"
          >
              <button
                type="button"
                onClick={() => {
                  if (!mobileFilterSectionsOpen.grouping && allTypesSelected) {
                    setMobileFilterSectionOpen("grouping", true);
                    return;
                  }
                  setMobileFilterSectionOpen("grouping", false);
                  onSetTypeFilter(STUDY_TYPE_FILTERS.all);
                }}
                disabled={filtersLoading}
                role="tab"
                aria-selected={allTypesSelected}
                className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] whitespace-nowrap ${mobileFilterSectionsOpen.grouping || allTypesSelected ? "" : "hidden sm:inline-flex"} ${filtersLoading && !allTypesSelected ? disabledBadgeClass() : badgeClass(allTypesSelected)}`}
              >
                <FilterChipLabel label="All" count={groupingCountLabel(allTypeCount)} />
              </button>
              {STUDY_GROUPING_FILTERS.map(([type, label]) => {
                const count = typeCounts[type];
                const isSelected = typeFilter === type || (allTypesSelected && count > 0);
                const unavailable = hasData && !isSelected && count === 0;
                const disabled = (filtersLoading && !isSelected) || unavailable;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      if (!mobileFilterSectionsOpen.grouping && isSelected) {
                        setMobileFilterSectionOpen("grouping", true);
                        return;
                      }
                      setMobileFilterSectionOpen("grouping", false);
                      onSetTypeFilter(type);
                    }}
                    disabled={disabled}
                    role="tab"
                    aria-selected={isSelected}
                    className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] whitespace-nowrap ${mobileFilterSectionsOpen.grouping || typeFilter === type ? "" : "hidden sm:inline-flex"} ${disabled && !isSelected ? disabledBadgeClass() : studyGroupingToneClass(type, isSelected)}`}
                  >
                    <FilterChipLabel label={label} count={groupingCountLabel(count)} />
                  </button>
                );
              })}
          </StudyFilterSection>
          {queueMode !== STUDY_QUEUE_TYPES.lesson ? (
            <StudyStatusFilters
              isOpen={mobileFilterSectionsOpen.status}
              filtersLoading={filtersLoading}
              hasData={hasData}
              srsFilter={srsFilter}
              srsStageFilter={srsStageFilter}
              srsCounts={srsCounts}
              srsStageCounts={srsStageCounts}
              onToggleSection={() => toggleMobileFilterSection("status")}
              onSetSectionOpen={(isOpen) => setMobileFilterSectionOpen("status", isOpen)}
              onSetSrsFilter={onSetSrsFilter}
              onSetSrsStageFilter={onSetSrsStageFilter}
            />
          ) : null}
          </div>
        </div>
      </header>
      </section>
      <section className="overflow-hidden rounded-2xl border border-line bg-surface/90 shadow-[0_20px_55px_rgba(8,16,36,0.12)]">
      {displayErrorMessage ? (
        <div className="px-5 pt-4">
          <div className="rounded-2xl border border-red-300/70 bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-700">
            {displayErrorMessage}
          </div>
        </div>
      ) : null}
      <div className="p-5">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {showLoadingOverlay ? (
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-foreground/65">Loading study queue and filters...</p>
          ) : (
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-foreground/65">
              Showing {formatNumber(filteredItems.length)}/{formatNumber(totalItems)} items
            </p>
          )}
          <div className={`flex w-full items-center gap-1 sm:ml-auto sm:w-auto sm:gap-2 ${hideControlsDuringInitialLoad ? "hidden" : ""}`}>
              <button type="button" onClick={() => onSetWaitSortOrder("oldest_wait")} className={`flex-1 whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.06em] sm:flex-none sm:px-3 sm:text-xs sm:tracking-[0.1em] ${badgeClass(waitSortOrder === "oldest_wait")}`}><span className="sm:hidden">{STUDY_PANEL_TEXT.oldestWaitShort}</span><span className="hidden sm:inline">Oldest Wait</span></button>
              <button type="button" onClick={() => onSetWaitSortOrder("newest_wait")} className={`flex-1 whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.06em] sm:flex-none sm:px-3 sm:text-xs sm:tracking-[0.1em] ${badgeClass(waitSortOrder === "newest_wait")}`}><span className="sm:hidden">{STUDY_PANEL_TEXT.newestWaitShort}</span><span className="hidden sm:inline">Newest Wait</span></button>
              {queueMode !== STUDY_QUEUE_TYPES.lesson ? (
                <button
                  type="button"
                  onClick={onToggleShowLocked}
                  className="flex-1 whitespace-nowrap rounded-full border border-line bg-surface px-2 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-foreground hover:bg-surface-muted sm:flex-none sm:px-3 sm:text-xs sm:tracking-[0.1em]"
                >
                  <span className="sm:hidden">{STUDY_PANEL_TEXT.lockedShort}</span>
                  <span className="hidden sm:inline">{showLocked ? STUDY_PANEL_TEXT.hideLocked : STUDY_PANEL_TEXT.showLocked}</span>
                </button>
              ) : null}
              <button
                type="button"
                onClick={toggleBulkMode}
                className={`flex-1 whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.06em] sm:flex-none sm:px-3 sm:text-xs sm:tracking-[0.1em] ${badgeClass(bulkModeEnabled)}`}
              >
                <span className="sm:hidden">{STUDY_PANEL_TEXT.bulkShort}</span>
                <span className="hidden sm:inline">{bulkModeEnabled ? STUDY_PANEL_TEXT.bulkOpsActive : STUDY_PANEL_TEXT.bulkOperations}</span>
              </button>
              <div className="ml-auto inline-flex items-center gap-1">
                {!studyMode ? (
                  <button
                    type="button"
                    onClick={onToggleShowEnglish}
                    disabled={!canToggleEnglish}
                    className="subject-pill inline-flex cursor-pointer items-center justify-center border-line bg-surface text-foreground hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
                    title={canToggleEnglish ? (showEnglish ? STUDY_PANEL_TEXT.hideEnglish : STUDY_PANEL_TEXT.showEnglish) : STUDY_PANEL_TEXT.hintsHidden}
                    aria-label={canToggleEnglish ? (showEnglish ? STUDY_PANEL_TEXT.hideEnglish : STUDY_PANEL_TEXT.showEnglish) : STUDY_PANEL_TEXT.hintsHidden}
                  >
                    {showEnglish ? (
                      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
                        <path d="M4 4l16 16" />
                      </svg>
                    )}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={toggleGlyphFont}
                  className="subject-pill inline-flex cursor-pointer items-center justify-center border-line bg-surface text-foreground hover:bg-surface-muted"
                  title="Font"
                  aria-label="Font"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5" fill="none">
                    <text x="6.3" y="14.1" fontSize="12.6" fontWeight="700" fill="currentColor" textAnchor="middle">A</text>
                    <text x="17.0" y="17.7" fontSize="13.4" fontWeight="700" fill="currentColor" textAnchor="middle">あ</text>
                  </svg>
                </button>
              </div>
          </div>
        </div>
        {bulkModeEnabled ? (
          <ExplorerBulkSelectionPanel
            selectedCount={selectedSubjectIds.size}
            preview={selectedPreview}
            rows={selectedItems.map((item) => ({
              subjectId: item.subjectId,
              characters: item.characters,
              subjectTypeLabel: shortSubjectTypeLabel(item.subjectType),
              wkLevel: typeof item.wkLevel === "number" ? item.wkLevel : null,
              srsStage: item.srsStage,
              reading: (item.primaryReadings?.[0] ?? item.readings?.[0]) || null,
              meaning: item.meanings?.[0] || null,
            }))}
            showFullList={showAllSelectedInBar}
            onToggleFullList={() => setShowAllSelectedInBar((value) => !value)}
            onSelectVisible={() => setSelectedSubjectIds(new Set(filteredItems.map((item) => item.subjectId)))}
            onClearSelection={() => setSelectedSubjectIds(new Set())}
            onDone={toggleBulkMode}
          />
        ) : null}
        <div className={`relative ${showLoadingOverlay ? "min-h-[14rem]" : ""}`}>
          {filteredItems.length > 0 ? (
            <>
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(230px,1fr))] lg:grid-cols-4">
              {filteredItems.map((item, index) => {
                const reviewBadge = isReviewQueueItem(item) ? formatNextReviewBadge(item.availableAt) : null;
                return (
                  <UnifiedExplorerCard
                    key={`${item.queueType}-${item.subjectId}`}
                    onClick={(meta) => {
                      if (!isUnauthorized) {
                        if (applyBulkSelection({
                          subjectId: item.subjectId,
                          sourceIndex: index,
                          shiftKey: Boolean(meta?.shiftKey),
                        })) {
                          return;
                        }
                        onSelectSubject(item.subjectId);
                      }
                    }}
                    className={`rounded-2xl border p-3 text-left transition ${isUnauthorized ? "cursor-not-allowed opacity-65" : "hover:brightness-95"} ${typeCardClass(item.subjectType, false)} ${selectedSubjectIds.has(item.subjectId) ? "ring-2 ring-amber-400" : ""}`}
                    indexLabel={
                      bulkModeEnabled ? (
                        <span className="inline-flex items-center gap-2 text-[10px] font-semibold text-foreground/60">
                          <input
                            type="checkbox"
                            checked={selectedSubjectIds.has(item.subjectId)}
                            readOnly
                            onClick={(event) => {
                              applyBulkSelection({
                                subjectId: item.subjectId,
                                sourceIndex: index,
                                shiftKey: event.shiftKey,
                              });
                              event.stopPropagation();
                            }}
                            className="h-4 w-4 rounded-sm border border-line bg-surface accent-accent"
                            aria-label={`Select ${item.characters}`}
                          />
                          #{index + 1}
                        </span>
                      ) : (
                        `#${index + 1}`
                      )
                    }
                    topRight={
                      <>
                        <span className={subjectTypePillClass(item.subjectType)}>{shortSubjectTypeLabel(item.subjectType)}</span>
                        {typeof item.wkLevel === "number" ? <span className="subject-pill border-line bg-surface text-foreground">L{item.wkLevel}</span> : null}
                        {typeof item.jlptMeta?.schoolGrade === "number" ? <span className="subject-pill border-line bg-surface text-foreground">G{item.jlptMeta.schoolGrade}</span> : null}
                        {item.jlptLevel ? <span className={jlptLevelPillClass()}>N{item.jlptLevel}</span> : null}
                      </>
                    }
                    glyphClassName={typeGlyphBoxClass(item.subjectType)}
                    glyphText={item.characters}
                    glyphTextClassName={glyphTextSizeClass(item.characters)}
                    glyphSubtitle={
                      studyMode
                        ? <span className="text-foreground/45">...</span>
                        : showEnglish
                          ? titleForDisplay(item, true)
                          : (glyphSubtitleForDisplay(item) ?? "")
                    }
                    statusChip={
                      isLessonLockedQueueItem(item)
                        ? undefined
                        : <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase whitespace-nowrap ${statusClass(item.status)}`}>{statusShortLabel(item.status)}</span>
                    }
                    middleChip={reviewBadge ? <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase whitespace-nowrap ${reviewBadge.className}`}>{reviewBadge.label}</span> : undefined}
                    rightChip={<span className="rounded-full border border-line bg-surface px-2 py-1 text-xs font-bold text-foreground">SRS {item.srsStage}</span>}
                  />
                );
              })}
              {loadingFillCount > 0
                ? Array.from({ length: loadingFillCount }, (_, index) => (
                    <div
                      key={`loading-fill-${index}`}
                      aria-hidden="true"
                      className="rounded-2xl border border-line bg-surface-muted/70 p-4"
                    />
                  ))
                : null}
            </div>
            {hasMoreMatchingItems ? (
              <div ref={sentinelRef} className="mt-3 rounded-xl border border-line bg-surface-muted px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.08em] text-foreground/60">
                {isLoadingMore
                  ? STUDY_PANEL_TEXT.loadingMore
                  : loadMoreError
                    ? `${STUDY_PANEL_TEXT.genericLoadErrorPrefix} ${loadMoreError}`
                    : queueMode === STUDY_QUEUE_TYPES.lesson
                      ? STUDY_PANEL_TEXT.loadingRemainingLessons
                      : STUDY_PANEL_TEXT.scrollToLoadMore}
              </div>
            ) : null}
            </>
          ) : showLoadingOverlay ? null : (
            <div className="rounded-2xl border border-line bg-surface-muted p-4 text-sm font-semibold text-foreground/70">
              <p>{STUDY_PANEL_TEXT.noMatches}{" "}<button type="button" onClick={handleResetFilters} className="font-bold text-accent underline underline-offset-2 hover:text-accent-2">{STUDY_PANEL_TEXT.clearFilters}</button></p>
              {queueMode === STUDY_QUEUE_TYPES.review ? (
                <StudyUpcomingReviewsSection
                  showUpcomingReviews={showUpcomingReviews}
                  upcomingItems={upcomingItems}
                  isLoadingUpcomingReviews={isLoadingUpcomingReviews}
                  upcomingErrorMessage={upcomingErrorMessage}
                  onToggleShowUpcomingReviews={onToggleShowUpcomingReviews}
                />
              ) : null}
            </div>
          )}
          <div
            aria-hidden={!showLoadingOverlay}
            className={`absolute inset-0 z-10 rounded-2xl border border-line bg-surface/70 backdrop-blur-[1px] transition-opacity duration-200 ${showLoadingOverlay ? "opacity-100" : "pointer-events-none opacity-0"}`}
          >
            <div className="flex h-full items-center justify-center px-4 text-center text-base font-bold text-foreground/85">
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
                    <span>{showFilterPagingState ? STUDY_PANEL_TEXT.loadingSelectedLevel : STUDY_PANEL_TEXT.loadingQueue}</span>
                </span>
            </div>
          </div>
        </div>
        <p className="mt-2 text-right text-[11px] font-medium text-foreground/55" title={cacheFooterTitle}>{cacheFooterText}</p>
      </div>
      </section>
    </>
  );
}
