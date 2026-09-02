import SubjectViewModeToggle from "@/app/shared/SubjectViewModeToggle";
import {
  SUBJECT_LIST_DIVIDERS,
  SUBJECT_LIST_SURFACE,
  SUBJECT_VIEW_MODES,
  SUBJECT_VIEW_MODE_VALUES,
  toSubjectListRow,
  type SubjectViewMode,
} from "@/app/shared/subjectListView";
import { getStoredEnum, setStoredEnum } from "@/lib/clientStorage";

/** Grid or list on the WaniKani explorer, remembered per surface. */
const LEVEL_VIEW_MODE_STORAGE_KEY = "wr:level-explorer:view-mode";

import { Fragment, useState } from "react";

import { usePracticePath } from "@/app/shared/userBasePath";
import { SUBJECT_TYPES } from "@/lib/domainConstants";
import ExplorerBulkSelectionPanel from "../../shared/ExplorerBulkSelectionPanel";
import StatusSrsChip, { ReviewTimingChip, SrsOnlyChip } from "../../shared/StatusSrsChip";
import UnifiedExplorerCard from "../../shared/UnifiedExplorerCard";
import { ReadingWithPronunciation, formatNextReviewBadge, formatNumber, glyphSubtitleForDisplay, glyphTextSizeClass, isNewGlyphWithinHours, jlptLevelPillClass, lockedCardStateClass, shortSubjectTypeLabel, subjectTypePillClass, titleForDisplay, typeCardClass, typeGlyphBoxClass } from "../lib/levelExplorerDisplay";
import { LEVEL_WK_STATUSES } from "../lib/levelExplorerDomain";
import { useLevelExplorerBulkSelection } from "../lib/useLevelExplorerBulkSelection";
import LevelExplorerDetailSection from "./LevelExplorerDetailSection";
import LevelCardTagOverlay from "./LevelCardTagOverlay";
import LevelExplorerGridToolbar from "./LevelExplorerGridToolbar";
import GlyphMetadataBadges from "../../shared/GlyphMetadataBadges";
import type { LevelExplorerItemsGridProps as Props } from "./LevelExplorerItemsGrid.types";
import { noTranslateClass } from "@/app/shared/japaneseText";

export default function LevelExplorerItemsGrid({
  accountId,
  searchMatchedSubjectIds,
  filteredItems,
  visibleItems,
  selectedItem,
  visibleDetailInsertIndex,
  selectedLevelList,
  studyMode,
  showEnglish,
  canToggleEnglish,
  isPeekRevealed,
  selectedMeaningExplanation,
  selectedReadingExplanationRaw,
  showReadingExplanation,
  hasPrimaryRelatedPanel,
  hasVisuallySimilarPanel,
  hasUsedInVocabularyPanel,
  vocabularyKanjiLinks,
  subjectById,
  selectedSubjectIds,
  isResetting,
  recentOnly,
  showLocked,
  allowHideLocked,
  sentinelRef,
  onClearFilters,
  onSelectItem,
  onTogglePeek,
  onSetRecentOnly,
  onSetShowLocked,
  onToggleShowEnglish,
  onToggleSubjectSelection,
  onSelectSubjectIds,
  onSelectVisibleSubjects,
  onClearSelection,
  onJumpToRelatedSubject,
  onJumpToKanji,
}: Props) {
  const practicePath = usePracticePath();
  const [viewMode, setViewMode] = useState<SubjectViewMode>(() =>
    getStoredEnum(LEVEL_VIEW_MODE_STORAGE_KEY, SUBJECT_VIEW_MODE_VALUES, SUBJECT_VIEW_MODES.grid));

  const {
    bulkModeEnabled,
    showAllSelectedInBar,
    setShowAllSelectedInBar,
    selectedItems,
    selectedPreview,
    resolveStudyTags,
    onToggleStudyTag,
    applyBulkSelection,
    toggleBulkMode,
    exitBulkMode,
  } = useLevelExplorerBulkSelection({
    accountId,
    filteredItems,
    visibleItems,
    selectedSubjectIds,
    onToggleSubjectSelection,
    onSelectSubjectIds,
    onClearSelection,
  });

  const selectedItemWithTags = selectedItem
    ? {
        ...selectedItem,
        studyTags: resolveStudyTags(selectedItem),
      }
    : null;

  return (
    <>
      <LevelExplorerGridToolbar
        visibleCount={visibleItems.length}
        totalCount={filteredItems.length}
        searching={searchMatchedSubjectIds !== null}
        showEnglish={showEnglish}
        canToggleEnglish={canToggleEnglish}
        recentOnly={recentOnly}
        showLocked={showLocked}
        allowHideLocked={allowHideLocked}
        bulkModeEnabled={bulkModeEnabled}
        onToggleShowEnglish={onToggleShowEnglish}
        onSetRecentOnly={onSetRecentOnly}
        onSetShowLocked={onSetShowLocked}
        onToggleBulkMode={toggleBulkMode}
      />
      {bulkModeEnabled ? (
        <ExplorerBulkSelectionPanel
          selectedCount={selectedSubjectIds.size}
          preview={selectedPreview}
          rows={selectedItems.map(toSubjectListRow)}
          showFullList={showAllSelectedInBar}
          isBusy={isResetting}
          onToggleFullList={() => setShowAllSelectedInBar((value) => !value)}
          onSelectVisible={onSelectVisibleSubjects}
          onClearSelection={onClearSelection}
          onRemoveSelected={onToggleSubjectSelection}
          onDone={exitBulkMode}
          /* The same two destinations the study explorer now offers; kanji only for the sheet. */
          destinations={{
            accountId,
            characters: selectedItems.map((item) => item.characters),
            practiceCharacters: selectedItems
              .filter((item) => item.subjectType === SUBJECT_TYPES.kanji)
              .map((item) => item.characters),
            practicePath,
            onSaved: exitBulkMode,
          }}
        />
      ) : null}
      {filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface-muted p-4 text-sm font-semibold text-foreground/70">
          No items match the current filters.{" "}
          <button
            type="button"
            onClick={onClearFilters}
            className="font-bold text-accent underline underline-offset-2 hover:text-accent-2"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <div className="mb-3 flex justify-end">
            <SubjectViewModeToggle
              value={viewMode}
              onChange={(next) => {
                setViewMode(next);
                setStoredEnum(LEVEL_VIEW_MODE_STORAGE_KEY, next);
              }}
            />
          </div>
          {/* One surface with hairlines in rows; a shelf of boxes in the grid. */}
          <div
            className={
              viewMode === SUBJECT_VIEW_MODES.list
                ? `${SUBJECT_LIST_SURFACE} ${SUBJECT_LIST_DIVIDERS}`
                : "grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
            }
          >
            {visibleItems.map((item, index) => {
              const cardItem = { ...item, studyTags: resolveStudyTags(item) };

              return (
                <Fragment key={`${item.subjectType}-${item.subjectId}`}>
            <UnifiedExplorerCard
              density={viewMode}
              activateOn="glyph-box"
              onClick={(meta) => {
                if (
                  applyBulkSelection({
                    subjectId: item.subjectId,
                    shiftKey: Boolean(meta?.shiftKey),
                    sourceIndex: index,
                  })
                ) {
                  return;
                }

                onSelectItem(item.subjectId);
              }}
              dataSubjectId={item.subjectId}
              className={`rounded-2xl border p-3 text-left transition hover:brightness-95 ${typeCardClass(
                item.subjectType,
                selectedItem?.subjectId === item.subjectId,
              )} ${lockedCardStateClass(item)}`}
              indexLabel={
                bulkModeEnabled ? (
                  <span className="inline-flex items-center gap-2">
                    <span
                      role="checkbox"
                      aria-checked={selectedSubjectIds.has(item.subjectId)}
                      tabIndex={0}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        applyBulkSelection({
                          subjectId: item.subjectId,
                          shiftKey: event.shiftKey,
                          sourceIndex: index,
                        });
                      }}
                      onKeyDown={(event) => {
                        if (event.key === " " || event.key === "Enter") {
                          event.preventDefault();
                          event.stopPropagation();
                          onToggleSubjectSelection(item.subjectId);
                        }
                      }}
                      className={`inline-flex h-4 w-4 items-center justify-center rounded border ${
                        selectedSubjectIds.has(item.subjectId)
                          ? "border-accent bg-accent text-white"
                          : "border-line bg-surface text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                    <span>#{formatNumber(index + 1)}</span>
                  </span>
                ) : (
                  `#${formatNumber(index + 1)}`
                )
              }
              topRight={
                <>
                  <span className={subjectTypePillClass(item.subjectType)}>{shortSubjectTypeLabel(item.subjectType)}</span>
                  {typeof item.jlptMeta?.schoolGrade === "number" ? (
                    <span className="subject-pill border-line bg-surface text-foreground">G{item.jlptMeta.schoolGrade}</span>
                  ) : null}
                  {item.jlptLevel ? (
                    <span translate="no" className={noTranslateClass(jlptLevelPillClass())}>{`N${item.jlptLevel}`}</span>
                  ) : null}
                  {isNewGlyphWithinHours(item) ? (
                    <span className="subject-pill border-emerald-300 bg-emerald-100 text-emerald-800">NEW</span>
                  ) : null}
                </>
              }
              glyphClassName={`${typeGlyphBoxClass(item.subjectType)} ${item.status === LEVEL_WK_STATUSES.locked || item.srsStage <= 0 ? "opacity-60" : ""}`}
              glyphText={cardItem.characters}
              glyphTextClassName={`${glyphTextSizeClass(cardItem.characters)} whitespace-nowrap`}
              glyphOverlay={
                <>
                  <GlyphMetadataBadges
                    level={item.wkLevel ?? selectedLevelList[selectedLevelList.length - 1]}
                    successRate={item.successRate}
                  />
                  <LevelCardTagOverlay
                    item={cardItem}
                    bulkModeEnabled={bulkModeEnabled}
                    onToggleStudyTag={onToggleStudyTag}
                  />
                </>
              }
              glyphSubtitle={
                studyMode ? (
                  <span className="text-foreground/60">...</span>
                ) : showEnglish ? (
                  titleForDisplay(cardItem, true)
                ) : (() => {
                  const subtitle = glyphSubtitleForDisplay(cardItem);
                  if (!subtitle) {
                    return null;
                  }
                  return <ReadingWithPronunciation reading={subtitle} />;
                })()
              }
              statusChip={
                item.status !== LEVEL_WK_STATUSES.burned
                  ? (() => {
                      const nextReviewBadge = formatNextReviewBadge(item.availableAt);
                      if (!nextReviewBadge) {
                        return <span />;
                      }
                      return (
                          <ReviewTimingChip label={nextReviewBadge.label} className={nextReviewBadge.className} />
                      );
                    })()
                  : <span />
              }
              middleChip={undefined}
              rightChip={
                item.status === LEVEL_WK_STATUSES.locked
                  ? <SrsOnlyChip srsStage={item.srsStage} />
                    : <StatusSrsChip status={item.status} srsStage={item.srsStage} />
              }
            />

            {selectedItem && !bulkModeEnabled && index === visibleDetailInsertIndex ? (
              <LevelExplorerDetailSection
                accountId={accountId}
                selectedItem={selectedItemWithTags ?? selectedItem}
                studyTags={(selectedItemWithTags ?? selectedItem).studyTags ?? { favorite: false, trouble: false, burned: false }}
                onToggleStudyTag={(tag) => {
                  const effectiveSelected = selectedItemWithTags ?? selectedItem;
                  const current = effectiveSelected.studyTags ?? { favorite: false, trouble: false, burned: false };
                  void onToggleStudyTag(effectiveSelected.subjectId, tag, !current[tag]);
                }}
                showEnglish={showEnglish}
                canToggleEnglish={canToggleEnglish}
                onToggleShowEnglish={onToggleShowEnglish}
                studyMode={studyMode}
                revealStudyReading={isPeekRevealed}
                onTogglePeek={
                  studyMode
                    ? () => {
                        onTogglePeek(selectedItem.subjectId);
                      }
                    : null
                }
                selectedMeaningExplanation={selectedMeaningExplanation}
                selectedReadingExplanationRaw={selectedReadingExplanationRaw}
                showReadingExplanation={showReadingExplanation}
                hasPrimaryRelatedPanel={hasPrimaryRelatedPanel}
                hasVisuallySimilarPanel={hasVisuallySimilarPanel}
                hasUsedInVocabularyPanel={hasUsedInVocabularyPanel}
                vocabularyKanjiLinks={vocabularyKanjiLinks}
                subjectById={subjectById}
                onJumpToRelatedSubject={onJumpToRelatedSubject}
                onJumpToKanji={onJumpToKanji}
                onResetToLessons={() => {}}
                resetDisabled
                resetBusy={isResetting}
              />
            ) : null}
                </Fragment>
              );
            })}
          </div>
          {visibleItems.length < filteredItems.length ? (
            <div
              ref={sentinelRef}
              className="mt-3 rounded-xl border border-line bg-surface-muted px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.08em] text-foreground/60"
            >
              Loading more...
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
