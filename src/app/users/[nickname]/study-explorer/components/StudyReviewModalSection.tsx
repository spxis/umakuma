import type {
  ReviewOutcome,
  StudyQueueItem,
  StudyReviewSubmitResult,
  StudyViewerMode,
} from "../lib/studyExplorerTypes";
import { useGlyphFontPreference } from "@/lib/glyphFontPreference";
import { openViewGlyphViewer } from "@/lib/viewGlyphViewer";

import type { RelatedReference } from "./StudyReviewModal.types";
import {
  isLessonLockedQueueItem,
  isLessonQueueItem,
  isRadicalSubjectType,
  STUDY_REVIEW_OUTCOMES,
  STUDY_REVIEW_MODAL_SECTION_TEXT,
  STUDY_VIEWER_MODES,
} from "./StudyExplorer.constants";
import type { LevelItem } from "../../explorerTypes";
import LevelExplorerDetailSection from "../../level-explorer/components/LevelExplorerDetailSection";
import {
  ReadingWithPronunciation,
  glyphTextSizeClass,
  jlptLevelPillClass,
  shortSubjectTypeLabel,
  stripHtml,
  subjectTypePillClass,
  typeGlyphBoxClass,
} from "../../level-explorer/lib/levelExplorerDisplay";
import StatusSrsChip from "../../shared/StatusSrsChip";
import StudyReviewModalMetaPanels from "./StudyReviewModalMetaPanels";

type Props = {
  accountId: string;
  studyMode: boolean;
  showEnglish: boolean;
  canToggleEnglish: boolean;
  viewerMode: StudyViewerMode;
  selectedItem: StudyQueueItem;
  selectedOutcome: ReviewOutcome | undefined;
  isSubmittingSelected: boolean;
  submitFeedback: { kind: "success" | "error"; message: string } | null;
  requiresReveal: boolean;
  isAnswerRevealed: boolean;
  isOutcomeFinal: boolean;
  detailsRevealed: boolean;
  useStudyFlashLayout: boolean;
  flashCycleDone: boolean;
  flashRevealed: boolean;
  currentFlashKey: string;
  allMeanings: string[];
  primaryReadingHiragana: string;
  primaryReadingKatakana: string;
  secondaryReadingValue: string;
  hasRadicals: boolean;
  hasVisuallySimilar: boolean;
  hasUsedInVocabulary: boolean;
  hasComponentKanji: boolean;
  usedKanjiItems: RelatedReference[];
  usedInVocabularyCollapsed: boolean;
  usedKanjiCollapsed: boolean;
  usedInWordsCollapsed: boolean;
  jlptGradeLabel: string;
  wrong: number;
  skipped: number;
  correct: number;
  glyphViewerItems?: StudyQueueItem[];
  glyphViewerIndex?: number;
  onReveal: (assignmentId: number) => void;
  onSubmit: (assignmentId: number, result: StudyReviewSubmitResult) => void;
  onSkipCurrent: () => void;
  onStartLesson: (assignmentId: number) => void;
  onAdvanceFlashOrNext: () => void;
  onFlashTouchStart: (event: React.TouchEvent) => void;
  onFlashTouchEnd: (event: React.TouchEvent) => void;
  onSetFlashRevealKey: (value: string) => void;
  onToggleUsedInVocabularyCollapsed: () => void;
  onToggleUsedKanjiCollapsed: () => void;
  onToggleUsedInWordsCollapsed: () => void;
  onToggleShowEnglish: () => void;
};

export default function StudyReviewModalSection({
  accountId,
  studyMode,
  showEnglish,
  canToggleEnglish,
  viewerMode,
  selectedItem,
  selectedOutcome,
  isSubmittingSelected,
  submitFeedback,
  requiresReveal,
  isAnswerRevealed,
  isOutcomeFinal,
  detailsRevealed,
  useStudyFlashLayout,
  flashCycleDone,
  flashRevealed,
  currentFlashKey,
  allMeanings,
  primaryReadingHiragana,
  primaryReadingKatakana,
  secondaryReadingValue,
  hasRadicals,
  hasVisuallySimilar,
  hasUsedInVocabulary,
  hasComponentKanji,
  usedKanjiItems,
  usedInVocabularyCollapsed,
  usedKanjiCollapsed,
  usedInWordsCollapsed,
  jlptGradeLabel,
  wrong,
  skipped,
  correct,
  glyphViewerItems,
  glyphViewerIndex,
  onReveal,
  onSubmit,
  onSkipCurrent,
  onStartLesson,
  onAdvanceFlashOrNext,
  onFlashTouchStart,
  onFlashTouchEnd,
  onSetFlashRevealKey,
  onToggleUsedInVocabularyCollapsed,
  onToggleUsedKanjiCollapsed,
  onToggleUsedInWordsCollapsed,
  onToggleShowEnglish,
}: Props) {
  const showStatusChip = !isLessonLockedQueueItem(selectedItem);
  const resolvedViewerItems = glyphViewerItems && glyphViewerItems.length > 0 ? glyphViewerItems : [selectedItem];
  const resolvedViewerIndex = typeof glyphViewerIndex === "number" ? glyphViewerIndex : 0;
  const shouldUseUnifiedLessonDetail =
    isLessonQueueItem(selectedItem) &&
    viewerMode === STUDY_VIEWER_MODES.detail &&
    !useStudyFlashLayout &&
    detailsRevealed;
  const sectionFrameClass = shouldUseUnifiedLessonDetail
    ? ""
    : "rounded-2xl border-2 border-accent/35 bg-surface p-3 sm:p-5";

  const selectedMeaningExplanation = stripHtml(selectedItem.meaningExplanation) || "-";
  const selectedReadingExplanationRaw = stripHtml(selectedItem.readingExplanation);
  const showReadingExplanation = selectedReadingExplanationRaw.length > 0;
  const { fontFamily: glyphFontFamily, toggle: toggleGlyphFont } = useGlyphFontPreference();
  const flashReadingHint = primaryReadingHiragana !== "-" ? primaryReadingHiragana : secondaryReadingValue;
  const showFlashReadingHint = showEnglish && flashReadingHint.trim().length > 0 && flashReadingHint !== "-";

  const sanitizedRelatedItems = (items: RelatedReference[] | undefined) =>
    (items ?? []).map((item) => ({ ...item, wkLevel: null }));

  const unifiedDetailItem: StudyQueueItem = shouldUseUnifiedLessonDetail
    ? {
        ...selectedItem,
        radicals: sanitizedRelatedItems(selectedItem.radicals as RelatedReference[] | undefined),
        visuallySimilar: sanitizedRelatedItems(selectedItem.visuallySimilar as RelatedReference[] | undefined),
        usedInVocabulary: sanitizedRelatedItems(
          (selectedItem.usedInVocabulary as RelatedReference[] | undefined)?.length
            ? (selectedItem.usedInVocabulary as RelatedReference[] | undefined)
            : isRadicalSubjectType(selectedItem.subjectType)
              ? (selectedItem.componentKanji as RelatedReference[] | undefined)
              : (selectedItem.usedInVocabulary as RelatedReference[] | undefined),
        ),
        componentKanji: sanitizedRelatedItems(selectedItem.componentKanji as RelatedReference[] | undefined),
      }
    : selectedItem;

  return (
    <>
      <section className={sectionFrameClass}>
        {!studyMode && viewerMode === STUDY_VIEWER_MODES.flash ? (
          flashCycleDone ? (
            <button
              type="button"
              onClick={onAdvanceFlashOrNext}
              onTouchStart={onFlashTouchStart}
              onTouchEnd={onFlashTouchEnd}
              className="flex min-h-[68vh] w-full select-none flex-col items-center justify-center rounded-2xl border border-line bg-surface-muted px-6 py-8 text-center hover:bg-surface"
            >
              <p className="text-2xl font-black uppercase tracking-[0.12em] text-foreground/80 sm:text-3xl">
                {STUDY_REVIEW_MODAL_SECTION_TEXT.cardsDone}
              </p>
              <p className="mt-3 text-sm font-bold uppercase tracking-[0.1em] text-foreground/60 sm:text-base">
                {STUDY_REVIEW_MODAL_SECTION_TEXT.restartPrompt}
              </p>
            </button>
          ) : (
            <div className="grid min-h-[68vh] gap-3 lg:grid-cols-2 lg:items-stretch">
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onAdvanceFlashOrNext();
                }}
                onTouchStart={onFlashTouchStart}
                onTouchEnd={onFlashTouchEnd}
                className={`relative flex min-h-[20rem] select-none items-center justify-center rounded-2xl border p-6 ${typeGlyphBoxClass(
                  selectedItem.subjectType,
                )}`}
              >
                <div className="absolute left-1/2 top-4 z-10 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 flex-nowrap items-center justify-center gap-1 overflow-x-auto px-1">
                  <span className={subjectTypePillClass(selectedItem.subjectType)}>{shortSubjectTypeLabel(selectedItem.subjectType)}</span>
                  {typeof selectedItem.wkLevel === "number" ? <span className="subject-pill border-line bg-surface text-foreground">L{selectedItem.wkLevel}</span> : null}
                  {typeof selectedItem.jlptMeta?.schoolGrade === "number" ? <span className="subject-pill border-line bg-surface text-foreground">G{selectedItem.jlptMeta.schoolGrade}</span> : null}
                  {selectedItem.jlptLevel ? <span className={jlptLevelPillClass()}>N{selectedItem.jlptLevel}</span> : null}
                  {showStatusChip ? (
                    <StatusSrsChip status={selectedItem.status} srsStage={selectedItem.srsStage} />
                  ) : null}
                </div>
                <p style={{ fontFamily: glyphFontFamily }} className="text-center text-[clamp(5rem,14vw,11rem)] font-black leading-none text-current">
                  {selectedItem.characters}
                </p>
              </button>

              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (!flashRevealed) {
                    onSetFlashRevealKey(currentFlashKey);
                  }
                }}
                onTouchStart={onFlashTouchStart}
                onTouchEnd={onFlashTouchEnd}
                className="flex min-h-[20rem] w-full select-none flex-col justify-center rounded-2xl border border-line bg-surface px-6 py-6 text-left hover:bg-surface-muted lg:h-full lg:min-h-0"
              >
                {!flashRevealed ? (
                  <div className="mx-auto text-center">
                    <p className="text-base font-black uppercase tracking-[0.12em] text-foreground/70">
                      {STUDY_REVIEW_MODAL_SECTION_TEXT.tapToReveal}
                    </p>
                    <p className="mt-2 text-xs font-bold uppercase tracking-[0.1em] text-foreground/55">
                      {STUDY_REVIEW_MODAL_SECTION_TEXT.enterOrSpace}
                    </p>
                  </div>
                ) : (
                  <div className="grid h-full gap-4 lg:grid-rows-2">
                    <div className="rounded-xl border border-line bg-surface-muted px-4 py-4">
                      <p className="text-xs font-bold uppercase tracking-[0.1em] text-foreground/65">{STUDY_REVIEW_MODAL_SECTION_TEXT.reading}</p>
                      <p className="mt-2 text-5xl font-black leading-tight text-foreground">
                        {primaryReadingHiragana === "-" && secondaryReadingValue !== "-"
                          ? secondaryReadingValue
                          : primaryReadingHiragana}
                      </p>
                      {primaryReadingKatakana !== "-" ? (
                        <p className="mt-2 text-4xl font-black leading-tight text-foreground/75">
                          {primaryReadingKatakana}
                        </p>
                      ) : null}
                    </div>
                    <div className="rounded-xl border border-line bg-surface-muted px-4 py-4">
                      <p className="text-xs font-bold uppercase tracking-[0.1em] text-foreground/65">{STUDY_REVIEW_MODAL_SECTION_TEXT.meaning}</p>
                      <p className="mt-2 text-4xl font-black leading-tight text-foreground">
                        {allMeanings[0] ?? selectedItem.characters}
                      </p>
                      {allMeanings.length > 1 ? (
                        <p className="mt-2 text-sm font-semibold uppercase tracking-[0.08em] text-foreground/70">
                          {allMeanings.slice(1).join(" • ")}
                        </p>
                      ) : null}
                    </div>
                  </div>
                )}
              </button>
            </div>
          )
        ) : useStudyFlashLayout ? (
          <>
            <div className="grid h-[calc(100dvh-11.5rem)] min-h-[26rem] grid-rows-2 gap-2 lg:min-h-[68vh] lg:grid-cols-2 lg:grid-rows-1 lg:items-stretch">
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  openViewGlyphViewer({
                    items: resolvedViewerItems,
                    startIndex: Math.max(0, Math.min(resolvedViewerIndex, resolvedViewerItems.length - 1)),
                    accountId,
                  });
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openViewGlyphViewer({
                      items: resolvedViewerItems,
                      startIndex: Math.max(0, Math.min(resolvedViewerIndex, resolvedViewerItems.length - 1)),
                      accountId,
                    });
                  }
                }}
                className={`relative flex h-full cursor-pointer flex-col justify-center overflow-hidden rounded-2xl border p-3 transition-colors hover:bg-violet-100/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 sm:p-5 ${typeGlyphBoxClass(selectedItem.subjectType)}`}
                title={STUDY_REVIEW_MODAL_SECTION_TEXT.viewItemTitle}
              >
                <div className="absolute left-1/2 top-3 z-10 flex max-w-[calc(100%-1.25rem)] -translate-x-1/2 flex-nowrap items-center justify-center gap-1 overflow-hidden px-1 sm:top-4">
                  <span className={subjectTypePillClass(selectedItem.subjectType)}>{shortSubjectTypeLabel(selectedItem.subjectType)}</span>
                  {typeof selectedItem.wkLevel === "number" ? <span className="subject-pill border-line bg-surface text-foreground">L{selectedItem.wkLevel}</span> : null}
                  {typeof selectedItem.jlptMeta?.schoolGrade === "number" ? <span className="subject-pill border-line bg-surface text-foreground">G{selectedItem.jlptMeta.schoolGrade}</span> : null}
                  {selectedItem.jlptLevel ? <span className={jlptLevelPillClass()}>N{selectedItem.jlptLevel}</span> : null}
                  {showStatusChip ? (
                    <StatusSrsChip status={selectedItem.status} srsStage={selectedItem.srsStage} />
                  ) : null}
                  {canToggleEnglish ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onToggleShowEnglish();
                      }}
                      className="subject-pill inline-flex cursor-pointer items-center justify-center border-line bg-surface text-foreground/75 hover:bg-surface-muted"
                      title={showEnglish ? "Hide English" : "Show English"}
                      aria-label={showEnglish ? "Hide English" : "Show English"}
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
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      toggleGlyphFont();
                    }}
                    className="subject-pill inline-flex cursor-pointer items-center justify-center border-line bg-surface text-foreground/75 hover:bg-surface-muted"
                    title={STUDY_REVIEW_MODAL_SECTION_TEXT.font}
                    aria-label={STUDY_REVIEW_MODAL_SECTION_TEXT.font}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5" fill="none">
                      <text x="6.3" y="14.1" fontSize="12.6" fontWeight="700" fill="currentColor" textAnchor="middle">A</text>
                      <text x="17.0" y="17.7" fontSize="13.4" fontWeight="700" fill="currentColor" textAnchor="middle">あ</text>
                    </svg>
                  </button>
                </div>

                <p style={{ fontFamily: glyphFontFamily }} className="px-2 text-center text-[clamp(2.8rem,10.4vw,5.4rem)] font-black leading-none text-current sm:text-[clamp(3.6rem,8vw,7rem)]">
                  {selectedItem.characters}
                </p>
                {showFlashReadingHint ? (
                  <p className="pointer-events-none absolute left-1/2 top-1/2 w-full -translate-x-1/2 translate-y-[2.7rem] px-2 text-center text-xl font-semibold leading-tight text-foreground/80 sm:translate-y-[4.4rem] sm:text-2xl lg:translate-y-[4.9rem]">
                    <ReadingWithPronunciation reading={flashReadingHint} />
                  </p>
                ) : null}

                {detailsRevealed ? (
                  <div className="absolute inset-x-2 bottom-2 grid gap-2 sm:inset-x-3 sm:bottom-3">
                    <div className="rounded-xl border border-line bg-surface-muted/95 px-3 py-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-foreground/65">{STUDY_REVIEW_MODAL_SECTION_TEXT.reading}</p>
                      <p className="mt-1 line-clamp-2 text-2xl font-black leading-tight text-foreground sm:text-3xl">
                        {primaryReadingHiragana === "-" && secondaryReadingValue !== "-" ? secondaryReadingValue : primaryReadingHiragana}
                      </p>
                      {primaryReadingKatakana !== "-" ? <p className="line-clamp-1 text-sm font-semibold text-foreground/75 sm:text-base">{primaryReadingKatakana}</p> : null}
                    </div>
                    <div className="rounded-xl border border-line bg-surface-muted/95 px-3 py-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-foreground/65">{STUDY_REVIEW_MODAL_SECTION_TEXT.meaning}</p>
                      <p className="mt-1 line-clamp-2 text-[2rem] font-black leading-tight text-foreground sm:text-[2.2rem]">{allMeanings[0] ?? selectedItem.characters}</p>
                      {allMeanings.length > 1 ? <p className="line-clamp-2 text-xs font-semibold uppercase tracking-[0.08em] text-foreground/70 sm:text-sm">{allMeanings.slice(1).join(" • ")}</p> : null}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="relative h-full rounded-2xl border border-line bg-surface-muted p-3 sm:p-4">
                {!detailsRevealed ? (
                  <button
                    type="button"
                    onClick={() => onReveal(selectedItem.assignmentId)}
                    disabled={isSubmittingSelected}
                    className="flex h-full w-full cursor-pointer flex-col items-center justify-center rounded-2xl bg-surface-muted text-center transition-colors hover:bg-sky-100/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                  >
                    <p className="text-sm font-black uppercase tracking-[0.12em] text-foreground/80 sm:text-base">{STUDY_REVIEW_MODAL_SECTION_TEXT.showAnswer}</p>
                    <p className="mt-2 text-xs font-bold uppercase tracking-[0.1em] text-foreground/55">{STUDY_REVIEW_MODAL_SECTION_TEXT.spaceToReveal}</p>
                  </button>
                ) : isOutcomeFinal ? (
                  <div className="flex h-full w-full items-center justify-center rounded-2xl border-2 border-line bg-surface px-3 py-3 text-center sm:px-4 sm:py-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.1em] text-foreground/65">{STUDY_REVIEW_MODAL_SECTION_TEXT.answerLocked}</p>
                      <p className={`mt-2 text-2xl font-black uppercase ${selectedOutcome === STUDY_REVIEW_OUTCOMES.correct ? "text-emerald-700" : "text-red-700"}`}>{selectedOutcome}</p>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.08em] text-foreground/60">{STUDY_REVIEW_MODAL_SECTION_TEXT.readOnlyHint}</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid h-full grid-rows-2 gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => onSubmit(selectedItem.assignmentId, STUDY_REVIEW_OUTCOMES.wrong)} disabled={isSubmittingSelected} aria-keyshortcuts="1" title="Wrong (Key: 1)" className="h-full w-full cursor-pointer rounded-2xl border-2 border-red-300 bg-red-50 px-3 py-2 text-sm font-black uppercase tracking-[0.1em] text-red-800 transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:py-4">
                        <span className="block">{STUDY_REVIEW_MODAL_SECTION_TEXT.wrong}</span>
                        <span className="mt-1 block text-xl leading-none">{wrong}</span>
                      </button>
                      <button type="button" onClick={() => onSubmit(selectedItem.assignmentId, STUDY_REVIEW_OUTCOMES.correct)} disabled={isSubmittingSelected} aria-keyshortcuts="2" title="Correct (Key: 2)" className="h-full w-full cursor-pointer rounded-2xl border-2 border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-black uppercase tracking-[0.1em] text-emerald-800 transition-colors hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:py-4">
                        <span className="block">{STUDY_REVIEW_MODAL_SECTION_TEXT.correct}</span>
                        <span className="mt-1 block text-xl leading-none">{correct}</span>
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={onSkipCurrent}
                      disabled={isSubmittingSelected}
                      className="h-full w-full cursor-pointer rounded-2xl border-2 border-amber-300 bg-amber-50 px-3 py-2 text-sm font-black uppercase tracking-[0.1em] text-amber-800 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:py-3"
                    >
                      <span className="block">{STUDY_REVIEW_MODAL_SECTION_TEXT.skipped}</span>
                      <span className="mt-1 block text-xl leading-none">{skipped}</span>
                    </button>
                  </div>
                )}

                {isSubmittingSelected ? (
                  <div className="absolute inset-3 z-10 rounded-2xl bg-surface/55 backdrop-blur-[1px] sm:inset-4" />
                ) : null}
              </div>
            </div>
          </>
        ) : requiresReveal && !isAnswerRevealed ? (
          <div className="grid min-h-[68vh] gap-3 lg:grid-cols-2 lg:items-stretch">
            <div className={`flex min-h-[20rem] items-center justify-center rounded-2xl border p-6 ${typeGlyphBoxClass(selectedItem.subjectType)}`}>
              <p style={{ fontFamily: glyphFontFamily }} className="text-center text-[clamp(5rem,14vw,11rem)] font-black leading-none text-current">{selectedItem.characters}</p>
            </div>
            <button type="button" onClick={() => onReveal(selectedItem.assignmentId)} className="flex min-h-[20rem] w-full flex-col justify-center rounded-2xl border border-line bg-surface px-6 py-6 text-left hover:bg-surface-muted lg:h-full lg:min-h-0">
              <div className="mx-auto text-center">
                <p className="text-base font-black uppercase tracking-[0.12em] text-foreground/70">{STUDY_REVIEW_MODAL_SECTION_TEXT.showAnswer}</p>
                <p className="mt-2 text-xs font-bold uppercase tracking-[0.1em] text-foreground/55">{STUDY_REVIEW_MODAL_SECTION_TEXT.spaceToReveal}</p>
              </div>
            </button>
          </div>
        ) : (
          shouldUseUnifiedLessonDetail ? (
            <LevelExplorerDetailSection
              accountId={accountId}
              selectedItem={unifiedDetailItem}
              showEnglish={showEnglish}
              clampLongTitle
              canToggleEnglish={canToggleEnglish}
              onToggleShowEnglish={onToggleShowEnglish}
              hideTimeStats
              studyMode={false}
              selectedMeaningExplanation={selectedMeaningExplanation}
              selectedReadingExplanationRaw={selectedReadingExplanationRaw}
              showReadingExplanation={showReadingExplanation}
              hasPrimaryRelatedPanel={hasRadicals}
              hasVisuallySimilarPanel={hasVisuallySimilar}
              hasUsedInVocabularyPanel={hasUsedInVocabulary}
              vocabularyKanjiLinks={[]}
              subjectById={new Map<number, LevelItem>()}
              onJumpToRelatedSubject={async () => {}}
              onJumpToKanji={async () => {}}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-start">
              <div className={`inline-flex min-h-[5.75rem] min-w-[5.75rem] items-center justify-center rounded-2xl border px-4 py-3 ${typeGlyphBoxClass(selectedItem.subjectType)}`}>
                <p style={{ fontFamily: glyphFontFamily }} className={`text-center font-black leading-none ${glyphTextSizeClass(selectedItem.characters)}`}>{selectedItem.characters}</p>
              </div>
              <div>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <p className="text-3xl font-black text-foreground">{detailsRevealed ? (allMeanings[0] ?? selectedItem.characters) : "???"}</p>
                    {detailsRevealed && allMeanings.length > 1 ? <p className="mt-1 hidden text-xs font-semibold uppercase tracking-[0.08em] text-foreground/65 sm:block">{STUDY_REVIEW_MODAL_SECTION_TEXT.altMeanings}: {allMeanings.slice(1).join(" • ")}</p> : null}
                  </div>
                  <div className="flex flex-nowrap justify-self-end gap-1">
                    <span className={subjectTypePillClass(selectedItem.subjectType)}>{shortSubjectTypeLabel(selectedItem.subjectType)}</span>
                    {typeof selectedItem.wkLevel === "number" ? <span className="subject-pill border-line bg-surface text-foreground">L{selectedItem.wkLevel}</span> : null}
                    {typeof selectedItem.jlptMeta?.schoolGrade === "number" ? <span className="subject-pill border-line bg-surface text-foreground">G{selectedItem.jlptMeta.schoolGrade}</span> : null}
                    {selectedItem.jlptLevel ? <span className={jlptLevelPillClass()}>N{selectedItem.jlptLevel}</span> : null}
                    {showStatusChip ? <StatusSrsChip status={selectedItem.status} srsStage={selectedItem.srsStage} /> : null}
                  </div>
                </div>
                {detailsRevealed && allMeanings.length > 1 ? (
                  <div className="mt-2 rounded-xl border border-line bg-surface px-3 py-2 sm:hidden">
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-foreground/65">{STUDY_REVIEW_MODAL_SECTION_TEXT.altMeanings}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-foreground/80">{allMeanings.slice(1).join(" • ")}</p>
                  </div>
                ) : null}
              </div>
            </div>
          )
        )}
      </section>

      <StudyReviewModalMetaPanels
        accountId={accountId}
        studyMode={studyMode}
        viewerMode={viewerMode}
        selectedItem={selectedItem}
        submitFeedback={submitFeedback}
        isSubmittingSelected={isSubmittingSelected}
        detailsRevealed={detailsRevealed}
        useStudyFlashLayout={useStudyFlashLayout}
        suppressDetails={shouldUseUnifiedLessonDetail}
        requiresReveal={requiresReveal}
        isAnswerRevealed={isAnswerRevealed}
        isOutcomeFinal={isOutcomeFinal}
        showEnglish={showEnglish}
        primaryReadingHiragana={primaryReadingHiragana}
        primaryReadingKatakana={primaryReadingKatakana}
        secondaryReadingValue={secondaryReadingValue}
        hasRadicals={hasRadicals}
        hasVisuallySimilar={hasVisuallySimilar}
        hasUsedInVocabulary={hasUsedInVocabulary}
        hasComponentKanji={hasComponentKanji}
        usedKanjiItems={usedKanjiItems}
        usedInVocabularyCollapsed={usedInVocabularyCollapsed}
        usedKanjiCollapsed={usedKanjiCollapsed}
        usedInWordsCollapsed={usedInWordsCollapsed}
        jlptGradeLabel={jlptGradeLabel}
        wrong={wrong}
        skipped={skipped}
        correct={correct}
        onSubmit={onSubmit}
        onSkipCurrent={onSkipCurrent}
        onStartLesson={onStartLesson}
        onToggleUsedInVocabularyCollapsed={onToggleUsedInVocabularyCollapsed}
        onToggleUsedKanjiCollapsed={onToggleUsedKanjiCollapsed}
        onToggleUsedInWordsCollapsed={onToggleUsedInWordsCollapsed}
      />
    </>
  );
}
