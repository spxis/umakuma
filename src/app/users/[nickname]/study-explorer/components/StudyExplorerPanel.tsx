import { glyphTextSizeClass } from "@/app/shared/glyphSizes";
import { useState } from "react";
import ExplorerBulkSelectionPanel from "../../shared/ExplorerBulkSelectionPanel";
import { usePracticePath } from "@/app/shared/userBasePath";
import { SUBJECT_TYPES } from "@/lib/domainConstants";
import UnifiedExplorerCard from "../../shared/UnifiedExplorerCard";
import ExplorerSearchBar from "../../ExplorerSearchBar";
import StudyGroupingFilters from "./StudyGroupingFilters";
import StudyLevelFilters from "./StudyLevelFilters";
import StudyStatusFilters from "./StudyStatusFilters";
import StudyUpcomingReviewsSection from "./StudyUpcomingReviewsSection";
import StudyLoadingShimmerOverlay from "./StudyLoadingShimmerOverlay";
import {
  isAllStudyTypeFilter,
  isLessonLockedQueueItem,
  isReviewQueueItem,
  STUDY_PANEL_TEXT,
  STUDY_QUEUE_TYPES,
  STUDY_VIEW_MODE_STORAGE_KEY,
} from "./StudyExplorer.constants";
import {
  formatNextReviewBadge,
  formatNumber,
  glyphSubtitleForDisplay,
  jlptLevelPillClass,
  shortSubjectTypeLabel,
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
import { ExplorerPill, NeutralPill } from "../../shared/ExplorerPill";
import StatusSrsChip, { ReviewTimingChip, SrsOnlyChip } from "../../shared/StatusSrsChip";
import { usePersistedBoolean } from "@/lib/usePersistedBoolean";
import { useGlyphFontPreference } from "@/lib/glyphFontPreference";
import StudyCardTagOverlay from "./StudyCardTagOverlay";
import StudyTagFilterNotice from "./StudyTagFilterNotice";
import StudyTagListsButton from "../../../../shared/StudyTagListsButton";
import StudySortButtons from "./StudySortButtons";
import StudyExplorerRows from "./StudyExplorerRows";
import SubjectViewModeToggle from "@/app/shared/SubjectViewModeToggle";
import {
  SUBJECT_VIEW_MODES,
  SUBJECT_VIEW_MODE_VALUES,
  toSubjectListRow,
  type SubjectViewMode,
} from "@/app/shared/subjectListView";
import { getStoredEnum, setStoredEnum } from "@/lib/clientStorage";
import GlyphMetadataBadges from "../../shared/GlyphMetadataBadges";
import FieldLabel from "../../../../shared/FieldLabel";
import { useExplorerFiling } from "@/app/shared/useExplorerFiling";
import { levelItemHit } from "@/lib/subjectFiler";
import ExplorerLoadingFillCards from "../../shared/ExplorerLoadingFillCards";
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
  isAwaitingInitialQueueState,
  isLoading,
  isValidating,
  hasData,
  isUnauthorized,
  errorMessage,
  showUpcomingReviews,
  upcomingItems,
  isLoadingUpcomingReviews,
  upcomingErrorMessage,
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
  onToggleShowUpcomingReviews,
  onOpenStudySourceManager,
  onSetWaitSortOrder,
  onSelectSubject,
  onToggleStudyTag,
  onClearAllFilters,
  onClearQueueTagFilter,
  queueTagFilter,
  accountId,
}: StudyExplorerPanelProps) {
  const { bulkModeEnabled, selectedSubjectIds, selectedItems, selectedPreview, applyBulkSelection, toggleBulkMode, setSelectedSubjectIds } = useStudyBulkReset({ filteredItems });
  /* Lists only: trouble and favourite are already on the row and in the glyph. */
  const filing = useExplorerFiling(accountId, filteredItems, levelItemHit, "lists");
  const practicePath = usePracticePath();
  const [showAllSelectedInBar, setShowAllSelectedInBar] = useState(false);
  const [filtersOpen, setFiltersOpen] = usePersistedBoolean("wr:study:filters-open", { defaultValue: true });
  const { sectionsOpen: mobileFilterSectionsOpen, toggleSection: toggleMobileFilterSection, setSectionOpen: setMobileFilterSectionOpen } = useStudyMobileFilterSections();
  const filtersLoading = !hasData;
  const showLoadingIndicator = (isLoading || isValidating || !hasData || isAwaitingInitialQueueState) && filteredItems.length === 0 && !errorMessage;
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
  /* The library and level; the page header above already says Study. */
  const studyHeaderLabel = `${studySourceHeaderLabel} (${studyLevelHeaderLabel})`;
  const hasMoreMatchingItems = hasMorePages && filteredItems.length < allTypeCount;
  const shouldShowLoadMoreUi = hasMoreMatchingItems && filteredItems.length > 1;
  const showFilterPagingState = queueMode === STUDY_QUEUE_TYPES.lesson && viewedLevel !== null && hasMoreMatchingItems && filteredItems.length === 0;
  const hideControlsDuringInitialLoad = (showLoadingIndicator || showFilterPagingState) && filteredItems.length === 0;
  const { toggle: toggleGlyphFont } = useGlyphFontPreference();
  const [viewMode, setViewMode] = useState<SubjectViewMode>(() =>
    getStoredEnum(STUDY_VIEW_MODE_STORAGE_KEY, SUBJECT_VIEW_MODE_VALUES, SUBJECT_VIEW_MODES.grid));
  const changeViewMode = (next: SubjectViewMode) => { setViewMode(next); setStoredEnum(STUDY_VIEW_MODE_STORAGE_KEY, next); };
  const showLoadingOverlay = hideControlsDuringInitialLoad;
  const loadingSkeletonCardCount = Math.max(4, gridColumns * 2);
  const loadingFillCount = shouldShowLoadMoreUi && isLoadingMore && gridColumns > 1
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
  const handleResetFilters = () => { onClearAllFilters(); onClearQueueTagFilter(); setFiltersOpen(true); openAllMobileFilterSections(); };
  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-line bg-surface/90 shadow-[0_20px_55px_rgba(8,16,36,0.12)]">
      <header className="border-b border-line bg-surface/90 px-5 py-4">
        <div className="grid gap-2 sm:flex sm:items-start sm:justify-between sm:gap-3">
          <div className="order-2 min-w-0 sm:order-1">
            <button
              type="button"
              onClick={onOpenStudySourceManager}
                className="group inline-flex max-w-full cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-left"
              title={studySourceIsCustom ? STUDY_PANEL_TEXT.changeStudyLibrary : STUDY_PANEL_TEXT.chooseStudyLibrary}
            >
              <h2 className="truncate text-[11px] font-black uppercase tracking-[0.12em] text-foreground/70 underline decoration-dotted decoration-[1px] decoration-foreground/25 underline-offset-[0.18em] transition-[text-decoration-color] duration-150 group-hover:decoration-foreground/45 group-focus-visible:decoration-foreground/55" title={studyHeaderLabel}>{studyHeaderLabel}</h2>
              <span className="hidden rounded-full border border-line bg-surface px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-foreground/75 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100 sm:inline-flex">{STUDY_PANEL_TEXT.change}</span>
            </button>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/60 sm:hidden">{studySourceIsCustom ? STUDY_PANEL_TEXT.tapTitleToChangeLibrary : STUDY_PANEL_TEXT.tapTitleToChooseLibrary}</p>
            <p className="hidden text-xs uppercase tracking-[0.08em] text-foreground/70 sm:block">{STUDY_PANEL_TEXT.subtitle}</p>
          </div>
          <div className="order-1 flex flex-wrap items-center justify-end gap-2 sm:order-2 sm:flex-nowrap sm:justify-start">
            <StudyTagFilterNotice queueTagFilter={queueTagFilter} onClear={onClearQueueTagFilter} />
            <StudyTagListsButton accountId={accountId} size="sm" />
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="flex items-center justify-between gap-2 sm:shrink-0 sm:justify-start">
              <FieldLabel>{STUDY_PANEL_TEXT.filters}</FieldLabel>
              <button type="button" onClick={handleResetFilters} className="inline-flex h-7 items-center rounded-full border border-line bg-surface px-3 text-[10px] font-bold uppercase tracking-[0.08em] text-foreground/75 transition hover:bg-surface-muted sm:h-8 sm:text-xs">{STUDY_PANEL_TEXT.clearAll}</button>
            </div>
            <div className="w-full min-w-0 sm:w-1/2">
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
          <StudyGroupingFilters
            typeFilter={typeFilter}
            typeCounts={typeCounts}
            allTypeCount={allTypeCount}
            allTypesSelected={allTypesSelected}
            filtersLoading={filtersLoading}
            hasData={hasData}
            sectionOpen={mobileFilterSectionsOpen.grouping}
            onToggleSection={() => toggleMobileFilterSection("grouping")}
            onSetSectionOpen={(open) => setMobileFilterSectionOpen("grouping", open)}
            onSetTypeFilter={onSetTypeFilter}
            badgeClass={badgeClass}
            disabledBadgeClass={disabledBadgeClass}
            groupingCountLabel={groupingCountLabel}
          />
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
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-foreground/65">{STUDY_PANEL_TEXT.loadingQueueAndFilters}</p>
          ) : (
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-foreground/65">
              {`Showing ${formatNumber(filteredItems.length)}/${formatNumber(allTypeCount)} items`}
            </p>
          )}
          <div className={`flex w-full flex-wrap items-center gap-1 sm:ml-auto sm:w-auto sm:gap-2 ${hideControlsDuringInitialLoad ? "hidden" : ""}`}>
              <StudySortButtons value={waitSortOrder} onChange={onSetWaitSortOrder} includeDifficulty={!studySourceIsCustom && queueMode === STUDY_QUEUE_TYPES.review} />
              <button
                type="button"
                onClick={toggleBulkMode}
                title={bulkModeEnabled ? STUDY_PANEL_TEXT.bulkOpsActive : STUDY_PANEL_TEXT.bulkOperations}
                aria-label={bulkModeEnabled ? STUDY_PANEL_TEXT.bulkOpsActive : STUDY_PANEL_TEXT.bulkOperations}
                className={`flex-1 whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.06em] sm:flex-none sm:px-3 sm:text-xs sm:tracking-[0.1em] ${badgeClass(bulkModeEnabled)}`}
              >
                  <span className="inline-flex w-full items-center justify-center" aria-hidden="true">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="4" height="4" rx="1" />
                    <path d="M10 6h11" />
                    <rect x="3" y="10" width="4" height="4" rx="1" />
                    <path d="M10 12h11" />
                    <rect x="3" y="16" width="4" height="4" rx="1" />
                    <path d="M10 18h11" />
                  </svg>
                </span>
                  <span className="sr-only">{bulkModeEnabled ? STUDY_PANEL_TEXT.bulkOpsActive : STUDY_PANEL_TEXT.bulkOperations}</span>
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
                  title={STUDY_PANEL_TEXT.font}
                  aria-label={STUDY_PANEL_TEXT.font}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5" fill="none">
                    <text x="6.3" y="14.1" fontSize="12.6" fontWeight="700" fill="currentColor" textAnchor="middle">A</text>
                    <text x="17.0" y="17.7" fontSize="13.4" fontWeight="700" fill="currentColor" textAnchor="middle">あ</text>
                  </svg>
                </button>
                {filing.toggle}
                <SubjectViewModeToggle value={viewMode} onChange={changeViewMode} />
              </div>
          </div>
        </div>
        {bulkModeEnabled ? (
          <ExplorerBulkSelectionPanel
            selectedCount={selectedSubjectIds.size}
            preview={selectedPreview}
            rows={selectedItems.map(toSubjectListRow)}
            showFullList={showAllSelectedInBar}
            onToggleFullList={() => setShowAllSelectedInBar((value) => !value)}
            onSelectVisible={() => setSelectedSubjectIds(new Set(filteredItems.map((item) => item.subjectId)))}
            onClearSelection={() => setSelectedSubjectIds(new Set())}
            onRemoveSelected={(subjectId) =>
              setSelectedSubjectIds((chosen) => {
                const next = new Set(chosen);
                next.delete(subjectId);
                return next;
              })
            }
            onDone={toggleBulkMode}
            /*
             * Somewhere for a bulk selection to go. Choosing items here could
             * only ever be undone before this - the panel counted them and
             * offered nothing to do with them, while the grade and JLPT
             * explorers had saved lists and practice sheets all along.
             *
             * Practice takes only the kanji. A study queue is radicals and
             * vocabulary as well, and a practice sheet is squares to write
             * kanji in - the list keeps everything, the sheet cannot.
             */
            destinations={{
              accountId,
              characters: selectedItems.map((item) => item.characters),
              practiceCharacters: selectedItems
                .filter((item) => item.subjectType === SUBJECT_TYPES.kanji)
                .map((item) => item.characters),
              practicePath,
              onSaved: toggleBulkMode,
            }}
          />
        ) : null}
        <div className={`relative ${showLoadingOverlay ? "min-h-[14rem]" : ""}`}>
          {filteredItems.length > 0 ? (
            <>
            {viewMode === SUBJECT_VIEW_MODES.list ? (
              <StudyExplorerRows
                items={filteredItems}
                isUnauthorized={isUnauthorized}
                onSelectSubject={onSelectSubject}
                onToggleStudyTag={onToggleStudyTag}
                bulkModeEnabled={bulkModeEnabled}
                selectedSubjectIds={selectedSubjectIds}
                onApplyBulkSelection={applyBulkSelection}
                renderFiling={filing.renderTrailing ? (row) => filing.renderTrailing!(row.item) : undefined}
              />
            ) : (
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(230px,1fr))] lg:grid-cols-4">
              {filteredItems.map((item, index) => {
                const reviewBadge = isReviewQueueItem(item) ? formatNextReviewBadge(item.availableAt) : null;
                return (
                  <UnifiedExplorerCard
                    key={`${item.queueType}-${item.subjectId}`}
                    activateOn={isUnauthorized ? "card" : "glyph-box"}
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
                          {`#${index + 1}`}
                        </span>
                      ) : (
                        `#${index + 1}`
                      )
                    }
                    topRight={
                      <>
                        <span className={subjectTypePillClass(item.subjectType)}>{shortSubjectTypeLabel(item.subjectType)}</span>
                          {typeof item.jlptMeta?.schoolGrade === "number" ? <NeutralPill>G{item.jlptMeta.schoolGrade}</NeutralPill> : null}
                        {item.jlptLevel ? <ExplorerPill className={jlptLevelPillClass()}>{`N${item.jlptLevel}`}</ExplorerPill> : null}
                      </>
                    }
                    glyphClassName={typeGlyphBoxClass(item.subjectType)}
                    glyphText={item.characters}
                    glyphTextClassName={glyphTextSizeClass(item.characters)}
                    glyphOverlay={
                      <>
                        <GlyphMetadataBadges level={item.wkLevel} successRate={item.successRate} />
                        <StudyCardTagOverlay item={item} bulkModeEnabled={bulkModeEnabled} onToggleStudyTag={onToggleStudyTag} />
                      </>
                    }
                    glyphSubtitle={
                      studyMode
                        ? <span className="text-foreground/60">...</span>
                        : showEnglish
                          ? titleForDisplay(item, true)
                          : (glyphSubtitleForDisplay(item) ?? "")
                    }
                    statusChip={
                      reviewBadge
                        ? <ReviewTimingChip label={reviewBadge.label} className={reviewBadge.className} />
                        : <span />
                    }
                    middleChip={undefined}
                    rightChip={
                      isLessonLockedQueueItem(item)
                        ? <SrsOnlyChip srsStage={item.srsStage} />
                        : <StatusSrsChip status={item.status} srsStage={item.srsStage} />
                    }
                    footer={filing.renderUnder?.(item)}
                  />
                );
              })}
              <ExplorerLoadingFillCards count={loadingFillCount} />
            </div>
            )}
            {hasMoreMatchingItems ? (
              <div ref={sentinelRef} className={shouldShowLoadMoreUi ? "mt-3 rounded-xl border border-line bg-surface-muted px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.08em] text-foreground/60" : "h-px w-full opacity-0 pointer-events-none"} aria-hidden={!shouldShowLoadMoreUi}>
                {shouldShowLoadMoreUi ? (isLoadingMore ? STUDY_PANEL_TEXT.loadingMore : loadMoreError ? `${STUDY_PANEL_TEXT.genericLoadErrorPrefix} ${loadMoreError}` : queueMode === STUDY_QUEUE_TYPES.lesson ? STUDY_PANEL_TEXT.loadingRemainingLessons : STUDY_PANEL_TEXT.scrollToLoadMore) : null}
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
          <StudyLoadingShimmerOverlay
            show={showLoadingOverlay}
            loadingSkeletonCardCount={loadingSkeletonCardCount}
            showFilterPagingState={showFilterPagingState}
            filtersOpen={filtersOpen}
          />
        </div>
        <p className="mt-2 text-right text-[11px] font-medium text-foreground/60" title={cacheFooterTitle}>{cacheFooterText}</p>
      </div>
      </section>
    </>
  );
}
