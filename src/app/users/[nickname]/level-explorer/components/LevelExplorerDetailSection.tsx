"use client";

import { useState } from "react";

import type { LevelItem } from "../../explorerTypes";
import { SUBJECT_TYPE_DISPLAY, SUBJECT_TYPES } from "@/lib/domainConstants";
import { useGlyphFontPreference } from "@/lib/glyphFontPreference";
import {
  ReadingListWithPronunciation,
  ReadingWithPronunciation,
  englishSubtitleForDisplay,
  formatDate,
  formatNextReviewBadge,
  formatRelativeFromNow,
  glyphHasReading,
  glyphSubtitleForDisplay,
  isNewGlyphWithinHours,
  jlptLevelPillClass,
  secondaryReadingsForDisplay,
  shortSubjectTypeLabel,
  statusClass,
  statusShortLabel,
  subjectTypePillClass,
  titleForDisplay,
  typeGlyphBoxClass,
} from "../lib/levelExplorerDisplay";
import LevelRelatedPanels from "./LevelRelatedPanels";
import LevelExplorerReviewStatsCard from "./LevelExplorerReviewStatsCard";
import {
  RelatedReferenceCards,
  VocabularyKanjiCards,
  type VocabularyKanjiLink,
} from "./LevelExplorerReferenceCards";
import {
  isKanjiSubjectType,
  isRadicalSubjectType,
  isVocabularySubjectType,
} from "../lib/levelExplorerDomain";
import { LEVEL_EXPLORER_TEXT } from "./LevelExplorer.constants";

type Props = {
  accountId: string;
  selectedItem: LevelItem;
  showEnglish: boolean;
  clampLongTitle?: boolean;
  titleMeaningToggleOnly?: boolean;
  canToggleEnglish?: boolean;
  onToggleShowEnglish?: (() => void) | null;
  hideTimeStats?: boolean;
  studyMode: boolean;
  revealStudyReading?: boolean;
  onTogglePeek?: (() => void) | null;
  selectedMeaningExplanation: string;
  selectedReadingExplanationRaw: string;
  showReadingExplanation: boolean;
  hasPrimaryRelatedPanel: boolean;
  hasVisuallySimilarPanel: boolean;
  hasUsedInVocabularyPanel: boolean;
  usedInVocabularyCollapsed?: boolean;
  onToggleUsedInVocabularyCollapsed?: (() => void) | null;
  vocabularyKanjiLinks: VocabularyKanjiLink[];
  subjectById: Map<number, LevelItem>;
  onJumpToRelatedSubject: (subjectId: number, targetLevel?: number | null) => Promise<void>;
  onJumpToKanji: (subjectId: number, wkLevel: number | null) => Promise<void>;
  onResetToLessons?: (() => void) | null;
  resetDisabled?: boolean;
  resetBusy?: boolean;
};

export default function LevelExplorerDetailSection({
  accountId,
  selectedItem,
  showEnglish,
  clampLongTitle = false,
  titleMeaningToggleOnly = false,
  canToggleEnglish = true,
  onToggleShowEnglish = null,
  hideTimeStats = false,
  studyMode,
  revealStudyReading = false,
  onTogglePeek = null,
  selectedMeaningExplanation,
  selectedReadingExplanationRaw,
  showReadingExplanation,
  hasPrimaryRelatedPanel,
  hasVisuallySimilarPanel,
  hasUsedInVocabularyPanel,
  usedInVocabularyCollapsed = false,
  onToggleUsedInVocabularyCollapsed = null,
  vocabularyKanjiLinks,
  subjectById,
  onJumpToRelatedSubject,
  onJumpToKanji,
  onResetToLessons = null,
}: Props) {
  const { fontFamily, toggle: toggleGlyphFont } = useGlyphFontPreference();
  const lockMeaningToggleToTitle = titleMeaningToggleOnly && !studyMode;
  const showEnglishForGlyphSubtitle = lockMeaningToggleToTitle ? false : showEnglish;
  const showEnglishForReadings = lockMeaningToggleToTitle ? true : showEnglish;
  const showEnglishForKanjiCards = lockMeaningToggleToTitle ? false : showEnglish;
  const [expandedHeaderTitleKey, setExpandedHeaderTitleKey] = useState<string | null>(null);
  const isStudyHidden = studyMode && !revealStudyReading;
  const canShowReadings = !isStudyHidden;
  const primaryMeaning = selectedItem.meanings.find((entry) => entry.trim().length > 0) ?? "";
  const nextReviewBadge = formatNextReviewBadge(selectedItem.availableAt);
  const revealedStudyTitle =
    primaryMeaning ||
    titleForDisplay(selectedItem, true) ||
    (isKanjiSubjectType(selectedItem.subjectType)
      ? SUBJECT_TYPE_DISPLAY[SUBJECT_TYPES.kanji].singular
      : isRadicalSubjectType(selectedItem.subjectType)
        ? SUBJECT_TYPE_DISPLAY[SUBJECT_TYPES.radical].singular
        : SUBJECT_TYPE_DISPLAY[SUBJECT_TYPES.vocabulary].singular);
  const headerTitle = studyMode
    ? revealStudyReading
      ? revealedStudyTitle
      : null
    : titleForDisplay(selectedItem, showEnglish);
  const headerSubtitle = studyMode
    ? revealStudyReading
      ? titleForDisplay(selectedItem, false)
      : null
    : null;
  const headerTitleKey = `${selectedItem.subjectId}:${headerTitle ?? ""}`;
  const isHeaderTitleExpanded = expandedHeaderTitleKey === headerTitleKey;
  const shouldClampHeaderTitle = clampLongTitle && Boolean(headerTitle) && !isHeaderTitleExpanded;

  const renderHeaderChipRow = (className: string) => (
    <div className={className}>
      <span className={subjectTypePillClass(selectedItem.subjectType)}>{shortSubjectTypeLabel(selectedItem.subjectType)}</span>
      {typeof selectedItem.wkLevel === "number" ? (
        <span className="subject-pill border-line bg-surface text-foreground">L{selectedItem.wkLevel}</span>
      ) : null}
      {typeof selectedItem.jlptMeta?.schoolGrade === "number" ? (
        <span className="subject-pill border-line bg-surface text-foreground">G{selectedItem.jlptMeta.schoolGrade}</span>
      ) : null}
      {selectedItem.jlptLevel ? (
        <span className={jlptLevelPillClass()}>N{selectedItem.jlptLevel}</span>
      ) : null}
      <span className={`subject-pill ${statusClass(selectedItem.status)}`}>{statusShortLabel(selectedItem.status)} - SRS {selectedItem.srsStage}</span>
      {isNewGlyphWithinHours(selectedItem) ? (
        <span className="subject-pill border-emerald-300 bg-emerald-100 text-emerald-800">NEW</span>
      ) : null}
      {nextReviewBadge ? <span className={`subject-pill ${nextReviewBadge.className}`}>{nextReviewBadge.label}</span> : null}
      {onToggleShowEnglish ? (
        <button
          type="button"
          onClick={onToggleShowEnglish}
          disabled={!canToggleEnglish}
          className="subject-pill inline-flex cursor-pointer items-center justify-center border-line bg-surface text-foreground hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
          title={canToggleEnglish ? (showEnglish ? LEVEL_EXPLORER_TEXT.hideEnglish : LEVEL_EXPLORER_TEXT.showEnglish) : LEVEL_EXPLORER_TEXT.hintsHidden}
          aria-label={canToggleEnglish ? (showEnglish ? LEVEL_EXPLORER_TEXT.hideEnglish : LEVEL_EXPLORER_TEXT.showEnglish) : LEVEL_EXPLORER_TEXT.hintsHidden}
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
          <text x="6.1" y="13.3" fontSize="10.5" fontWeight="700" fill="currentColor" textAnchor="middle">A</text>
          <text x="16.9" y="16.8" fontSize="11" fontWeight="700" fill="currentColor" textAnchor="middle">あ</text>
        </svg>
      </button>
    </div>
  );

  return (
    <section className="col-span-1 rounded-2xl border-2 border-accent/35 bg-surface p-5 sm:col-span-2 lg:col-span-4">
      {renderHeaderChipRow("mb-2 flex flex-wrap justify-start gap-1 sm:hidden")}
      <div className="grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start sm:gap-x-3">
        <div className="inline-flex sm:self-start">
          <div
            className={`inline-flex rounded-2xl border ${
              glyphHasReading(selectedItem)
                ? "min-h-[5.75rem] min-w-[5.75rem] flex-col items-center justify-center px-4 py-3"
                : "min-h-[5.75rem] min-w-[5.75rem] items-center justify-center px-4 py-3"
            } ${typeGlyphBoxClass(selectedItem.subjectType)}`}
          >
            <div>
              <p style={{ fontFamily }} className="text-center text-4xl font-black leading-none text-current">
                {selectedItem.characters}
              </p>
              {(() => {
                if (studyMode && isStudyHidden) {
                  return <p className="mt-1 w-full text-center text-sm font-semibold text-foreground/55">...</p>;
                }

                const subtitle = studyMode
                  ? glyphSubtitleForDisplay(selectedItem)
                  : showEnglishForGlyphSubtitle
                    ? englishSubtitleForDisplay(selectedItem)
                    : glyphSubtitleForDisplay(selectedItem);

                if (!subtitle) {
                  return null;
                }

                return (
                  <p className="mt-1 w-full text-center text-sm font-semibold text-foreground/85">
                    <ReadingWithPronunciation reading={subtitle} />
                  </p>
                );
              })()}
            </div>
          </div>
        </div>

        <div className="min-w-0">
          {renderHeaderChipRow("hidden flex-wrap justify-end gap-1 sm:flex")}
          {studyMode && onTogglePeek ? (
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={onTogglePeek}
                className="rounded-full border border-line bg-surface px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-foreground"
              >
                {isStudyHidden ? LEVEL_EXPLORER_TEXT.peek : LEVEL_EXPLORER_TEXT.hidePeek}
              </button>
            </div>
          ) : null}
          <div className="mt-2 min-w-0">
            {studyMode && isStudyHidden ? (
              <>
                <p className="text-base font-black uppercase tracking-[0.08em] text-foreground/80">Blind Review</p>
                <p className="mt-1 text-sm font-semibold text-foreground/65">Recall meaning and reading, then reveal answer.</p>
              </>
            ) : (
              <>
                {headerTitle ? (
                  clampLongTitle ? (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedHeaderTitleKey((value) =>
                          value === headerTitleKey ? null : headerTitleKey,
                        )
                      }
                      className="w-full cursor-pointer text-left"
                      title={isHeaderTitleExpanded ? "Collapse title" : "Expand title"}
                    >
                      <p className={`text-4xl font-black leading-tight text-foreground ${shouldClampHeaderTitle ? "line-clamp-2" : ""}`}>{headerTitle}</p>
                    </button>
                  ) : (
                    <p className="text-4xl font-black leading-tight text-foreground">{headerTitle}</p>
                  )
                ) : null}
                {headerSubtitle ? <p className="mt-1 text-2xl font-semibold text-foreground/85">{headerSubtitle}</p> : null}
              </>
            )}
          </div>
        </div>
      </div>

      {canShowReadings ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-line bg-surface-muted p-3 text-sm">
            <p className="text-xs font-bold uppercase text-foreground/70">Primary reading</p>
            <p className="mt-1 text-lg font-semibold text-foreground/90 sm:text-xl">
              {isRadicalSubjectType(selectedItem.subjectType) ? (
                "Not applicable"
              ) : (
                <ReadingListWithPronunciation readings={selectedItem.primaryReadings ?? []} mode={showEnglishForReadings ? "inline" : "plain"} />
              )}
            </p>
          </div>
          <div className="rounded-xl border border-line bg-surface-muted p-3 text-sm">
            <p className="text-xs font-bold uppercase text-foreground/70">Secondary readings</p>
            <p className="mt-1 text-lg font-semibold text-foreground/90 sm:text-xl">
              {isRadicalSubjectType(selectedItem.subjectType) ? (
                "Not applicable"
              ) : (
                <ReadingListWithPronunciation readings={secondaryReadingsForDisplay(selectedItem)} mode={showEnglishForReadings ? "inline" : "plain"} />
              )}
            </p>
          </div>
        </div>
      ) : null}

      {!hideTimeStats ? (
        <div className={`${canShowReadings ? "mt-3" : "mt-4"} grid gap-3 sm:grid-cols-2 lg:grid-cols-3`}>
        <div className="rounded-xl border border-line bg-surface-muted p-3 text-sm">
          <p className="text-xs font-bold uppercase text-foreground/70">Started</p>
          <p className="mt-1 font-semibold text-foreground/90">
            {formatDate(selectedItem.startedAt)}
            {formatRelativeFromNow(selectedItem.startedAt) ? ` (${formatRelativeFromNow(selectedItem.startedAt)})` : ""}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-surface-muted p-3 text-sm">
          <p className="text-xs font-bold uppercase text-foreground/70">Next review</p>
          <p className="mt-1 font-semibold text-foreground/90">{formatDate(selectedItem.availableAt)}</p>
        </div>
        <div className="rounded-xl border border-line bg-surface-muted p-3 text-sm">
          <p className="text-xs font-bold uppercase text-foreground/70">Passed</p>
          <p className="mt-1 font-semibold text-foreground/90">
            {formatDate(selectedItem.passedAt)}
            {formatRelativeFromNow(selectedItem.passedAt) ? ` (${formatRelativeFromNow(selectedItem.passedAt)})` : ""}
          </p>
        </div>
        </div>
      ) : null}

      {!studyMode || revealStudyReading ? (
        <div className={`mt-4 grid gap-3 ${showReadingExplanation ? "lg:grid-cols-2" : "lg:grid-cols-1"}`}>
          <article className="rounded-xl border border-line bg-surface-muted p-3 text-sm">
            <p className="text-xs font-bold uppercase text-foreground/70">Meaning explanation</p>
            <p className="mt-2 text-foreground/90">{selectedMeaningExplanation}</p>
          </article>
          {showReadingExplanation ? (
            <article className="rounded-xl border border-line bg-surface-muted p-3 text-sm">
              <p className="text-xs font-bold uppercase text-foreground/70">Reading explanation</p>
              <p className="mt-2 text-foreground/90">{selectedReadingExplanationRaw}</p>
            </article>
          ) : null}
        </div>
      ) : null}

      {!studyMode || revealStudyReading ? (
        <LevelRelatedPanels
          hasPrimary={hasPrimaryRelatedPanel}
          hasVisuallySimilar={hasVisuallySimilarPanel}
          hasUsedInVocabulary={hasUsedInVocabularyPanel}
          usedInVocabularyCollapsed={usedInVocabularyCollapsed}
          onToggleUsedInVocabularyCollapsed={onToggleUsedInVocabularyCollapsed}
          primaryTitle={
            isVocabularySubjectType(selectedItem.subjectType)
              ? SUBJECT_TYPE_DISPLAY[SUBJECT_TYPES.kanji].singular
              : SUBJECT_TYPE_DISPLAY[SUBJECT_TYPES.radical].plural
          }
          primaryContent={
            isVocabularySubjectType(selectedItem.subjectType) ? (
              <VocabularyKanjiCards
                links={vocabularyKanjiLinks}
                showEnglish={showEnglishForKanjiCards}
                selectedSubjectId={selectedItem.subjectId}
                onJumpToKanji={onJumpToKanji}
              />
            ) : (
              <RelatedReferenceCards
                items={selectedItem.radicals ?? []}
                large={isKanjiSubjectType(selectedItem.subjectType)}
                showEnglish={showEnglish}
                subjectById={subjectById}
                fallbackType={SUBJECT_TYPES.radical}
                onJumpToRelatedSubject={onJumpToRelatedSubject}
              />
            )
          }
          visuallySimilarContent={
            <RelatedReferenceCards
              items={selectedItem.visuallySimilar ?? []}
              large={isKanjiSubjectType(selectedItem.subjectType)}
              showEnglish={showEnglish}
              subjectById={subjectById}
              fallbackType={SUBJECT_TYPES.kanji}
              onJumpToRelatedSubject={onJumpToRelatedSubject}
            />
          }
          usedInVocabularyContent={
            <RelatedReferenceCards
              items={selectedItem.usedInVocabulary ?? []}
              large
              showEnglish={showEnglish}
              subjectById={subjectById}
              fallbackType={
                isRadicalSubjectType(selectedItem.subjectType)
                  ? SUBJECT_TYPES.kanji
                  : SUBJECT_TYPES.vocabulary
              }
              onJumpToRelatedSubject={onJumpToRelatedSubject}
            />
          }
        />
      ) : null}

      {!studyMode || isStudyHidden || revealStudyReading ? (
        <LevelExplorerReviewStatsCard
          accountId={accountId}
          subjectId={selectedItem.subjectId}
          currentSrsStage={selectedItem.srsStage}
          startedAt={selectedItem.startedAt}
        />
      ) : null}

      {onResetToLessons ? (
        <details className="mt-4 rounded-xl border border-line bg-surface-muted p-3">
          <summary className="cursor-pointer list-none text-xs font-bold uppercase tracking-[0.12em] text-foreground/70">
            Advanced Actions
          </summary>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-foreground/70">
              Per-item reset is not supported by the official WaniKani API.
            </p>
            <button
              type="button"
              onClick={onResetToLessons}
              disabled
              className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Unsupported
            </button>
          </div>
        </details>
      ) : null}
    </section>
  );
}
