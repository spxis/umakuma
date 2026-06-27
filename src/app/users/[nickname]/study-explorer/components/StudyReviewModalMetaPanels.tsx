import type {
  StudyQueueItem,
  StudyReviewSubmitResult,
  StudyViewerMode,
} from "../lib/studyExplorerTypes";

import type { RelatedReference } from "./StudyReviewModal.types";
import {
  isLessonQueueItem,
  isRadicalSubjectType,
  isReviewQueueItem,
  isVocabularySubjectType,
  STUDY_REVIEW_OUTCOMES,
  STUDY_REVIEW_META_TEXT,
  STUDY_VIEWER_MODES,
  usedInVocabularyTargetSubjectType,
} from "./StudyExplorer.constants";
import LevelExplorerReviewStatsCard from "../../level-explorer/components/LevelExplorerReviewStatsCard";
import { parseWordExamples } from "../../jlpt-explorer/lib/jlptExplorerContentHelpers";
import { openViewGlyphViewer } from "@/lib/viewGlyphViewer";
import { SUBJECT_TYPES, type SubjectType } from "@/lib/domainConstants";
import {
  formatTimestampWithRelative,
  metricCard,
  readingCard,
  readingDualScriptCard,
  readingWithPronunciation,
  readingsWithPronunciationList,
  relatedTileLabelClass,
} from "./StudyReviewModalHelpers";
import { stripHtml } from "../../level-explorer/lib/levelExplorerDisplay";
import { RelatedReferenceCards } from "../../level-explorer/components/LevelExplorerReferenceCards";
import type { LevelItem } from "../../explorerTypes";

const EMPTY_SUBJECT_BY_ID = new Map<number, LevelItem>();

type Props = {
  accountId: string;
  studyMode: boolean;
  viewerMode: StudyViewerMode;
  selectedItem: StudyQueueItem;
  submitFeedback: { kind: "success" | "error"; message: string } | null;
  isSubmittingSelected: boolean;
  detailsRevealed: boolean;
  useStudyFlashLayout: boolean;
  suppressDetails?: boolean;
  requiresReveal: boolean;
  isAnswerRevealed: boolean;
  isOutcomeFinal: boolean;
  showEnglish: boolean;
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
  onSubmit: (assignmentId: number, result: StudyReviewSubmitResult) => void;
  onSkipCurrent: () => void;
  onStartLesson: (assignmentId: number) => void;
  onToggleUsedInVocabularyCollapsed: () => void;
  onToggleUsedKanjiCollapsed: () => void;
  onToggleUsedInWordsCollapsed: () => void;
  onOpenRelatedSubject?: (subjectId: number, fallbackType: SubjectType) => void | Promise<void>;
};

export default function StudyReviewModalMetaPanels({
  accountId,
  studyMode,
  viewerMode,
  selectedItem,
  submitFeedback,
  isSubmittingSelected,
  detailsRevealed,
  useStudyFlashLayout,
  suppressDetails = false,
  requiresReveal,
  isAnswerRevealed,
  isOutcomeFinal,
  showEnglish,
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
  onSubmit,
  onSkipCurrent,
  onStartLesson,
  onToggleUsedInVocabularyCollapsed,
  onToggleUsedKanjiCollapsed,
  onToggleUsedInWordsCollapsed,
  onOpenRelatedSubject,
}: Props) {
  function openSingleGlyph(params: {
    subjectId: number;
    label: string;
    reading?: string | null;
    meaning?: string | null;
    subjectType?: SubjectType;
  }) {
    openViewGlyphViewer({
      accountId,
      items: [
        {
          assignmentId: -1,
          queueType: "review",
          subjectId: params.subjectId,
          subjectType: params.subjectType ?? SUBJECT_TYPES.kanji,
          wkLevel: selectedItem.wkLevel,
          characters: params.label,
          meanings: [params.meaning ?? "-"],
          readings: params.reading ? [params.reading] : [],
          primaryReadings: params.reading ? [params.reading] : [],
          radicals: [],
          visuallySimilar: [],
          usedInVocabulary: [],
          componentKanji: [],
          meaningExplanation: undefined,
          readingExplanation: undefined,
          jlptLevel: selectedItem.jlptLevel ?? null,
          jlptMeta: null,
          srsStage: selectedItem.srsStage,
          status: selectedItem.status,
          startedAt: selectedItem.startedAt ?? null,
          passedAt: selectedItem.passedAt ?? null,
          availableAt: selectedItem.availableAt ?? null,
        },
      ],
      startIndex: 0,
    });
  }

  const wordExamples = parseWordExamples(selectedItem.jlptMeta?.wordExamples);
  const selectedMeaningExplanation = stripHtml(selectedItem.meaningExplanation) || "-";
  const selectedReadingExplanationRaw = stripHtml(selectedItem.readingExplanation);
  const showReadingExplanation = selectedReadingExplanationRaw.length > 0;
  const showReadingCards = !isRadicalSubjectType(selectedItem.subjectType);

  const openFromRelatedItems = (
    items: RelatedReference[] | undefined,
    subjectId: number,
    fallbackType: SubjectType,
  ) => {
    if (onOpenRelatedSubject && subjectId > 0) {
      void onOpenRelatedSubject(subjectId, fallbackType);
      return;
    }

    const entry = (items ?? []).find((item) => item.subjectId === subjectId);
    openSingleGlyph({
      subjectId,
      label: entry?.label ?? String(subjectId),
      reading: entry?.reading ?? null,
      meaning: entry?.meaning ?? null,
      subjectType: fallbackType,
    });
  };

  const renderSharedRelatedCards = (
    items: RelatedReference[] | undefined,
    fallbackType: SubjectType,
    options?: { large?: boolean },
  ) => (
    <RelatedReferenceCards
      items={items ?? []}
      large={options?.large}
      showEnglish={showEnglish}
      subjectById={EMPTY_SUBJECT_BY_ID}
      fallbackType={fallbackType}
      onJumpToRelatedSubject={async (subjectId) => {
        openFromRelatedItems(items, subjectId, fallbackType);
      }}
    />
  );

  return (
    <>
      {!suppressDetails && ((!studyMode && viewerMode === STUDY_VIEWER_MODES.flash) || useStudyFlashLayout ? null : detailsRevealed ? (
        <>
          {showReadingCards ? (
            <div className="mt-3 grid gap-2 lg:grid-cols-2">
              {readingDualScriptCard(
                STUDY_REVIEW_META_TEXT.primaryReadings,
                readingWithPronunciation(primaryReadingHiragana, showEnglish),
                readingWithPronunciation(primaryReadingKatakana, showEnglish),
              )}
              {readingCard(STUDY_REVIEW_META_TEXT.secondaryReadings, readingsWithPronunciationList(secondaryReadingValue, showEnglish))}
            </div>
          ) : null}

          <div className={`mt-2 grid gap-2 ${showReadingExplanation ? "lg:grid-cols-2" : "lg:grid-cols-1"}`}>
            <article className="rounded-xl border border-line bg-surface p-3 text-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-foreground/65">Meaning explanation</p>
              <p className="mt-2 text-foreground/90">{selectedMeaningExplanation}</p>
            </article>
            {showReadingExplanation ? (
              <article className="rounded-xl border border-line bg-surface p-3 text-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-foreground/65">Reading explanation</p>
                <p className="mt-2 text-foreground/90">{selectedReadingExplanationRaw}</p>
              </article>
            ) : null}
          </div>

          {hasRadicals || hasVisuallySimilar || hasUsedInVocabulary ? (
            <div className="mt-2 space-y-2">
              {hasRadicals || hasVisuallySimilar ? (
                <div className={`grid gap-2 ${hasRadicals && hasVisuallySimilar ? "lg:grid-cols-2" : "lg:grid-cols-1"}`}>
                  {hasRadicals ? (
                    <div className="rounded-xl border border-line bg-surface px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-foreground/65">{STUDY_REVIEW_META_TEXT.radicals}</p>
                      {renderSharedRelatedCards(
                        selectedItem.radicals as RelatedReference[] | undefined,
                        SUBJECT_TYPES.radical,
                        { large: true },
                      )}
                    </div>
                  ) : null}
                  {hasVisuallySimilar ? (
                    <div className="rounded-xl border border-line bg-surface px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-foreground/65">{STUDY_REVIEW_META_TEXT.visuallySimilar}</p>
                      {renderSharedRelatedCards(
                        selectedItem.visuallySimilar as RelatedReference[] | undefined,
                        SUBJECT_TYPES.kanji,
                        { large: true },
                      )}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {hasUsedInVocabulary ? (
                <div className="rounded-xl border border-line bg-surface px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-foreground/65">
                      {isRadicalSubjectType(selectedItem.subjectType)
                        ? STUDY_REVIEW_META_TEXT.usedInKanji
                        : STUDY_REVIEW_META_TEXT.usedInVocabulary}
                    </p>
                    <button
                      type="button"
                      onClick={onToggleUsedInVocabularyCollapsed}
                      className="rounded-full border border-line bg-surface-muted px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-foreground hover:bg-surface"
                    >
                      {usedInVocabularyCollapsed ? STUDY_REVIEW_META_TEXT.expand : STUDY_REVIEW_META_TEXT.collapse}
                    </button>
                  </div>
                  {!usedInVocabularyCollapsed
                    ? renderSharedRelatedCards(
                        selectedItem.usedInVocabulary as RelatedReference[] | undefined,
                        usedInVocabularyTargetSubjectType(selectedItem.subjectType),
                        { large: true },
                      )
                    : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {hasComponentKanji ? (
            <div className="mt-2">
              <div className="rounded-xl border border-line bg-surface px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-foreground/65">{STUDY_REVIEW_META_TEXT.componentKanji}</p>
                {renderSharedRelatedCards(
                  selectedItem.componentKanji as RelatedReference[] | undefined,
                  SUBJECT_TYPES.kanji,
                  { large: true },
                )}
              </div>
            </div>
          ) : null}

          {isVocabularySubjectType(selectedItem.subjectType) && usedKanjiItems.length > 0 && !hasComponentKanji ? (
            <div className="mt-2">
              <div className="rounded-xl border border-line bg-surface px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-foreground/65">{STUDY_REVIEW_META_TEXT.usedKanji}</p>
                  <button
                    type="button"
                    onClick={onToggleUsedKanjiCollapsed}
                    className="rounded-full border border-line bg-surface-muted px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-foreground hover:bg-surface"
                  >
                    {usedKanjiCollapsed ? STUDY_REVIEW_META_TEXT.expand : STUDY_REVIEW_META_TEXT.collapse}
                  </button>
                </div>
                {!usedKanjiCollapsed
                  ? renderSharedRelatedCards(usedKanjiItems, SUBJECT_TYPES.kanji, { large: true })
                  : null}
              </div>
            </div>
          ) : null}

          {selectedItem.jlptMeta ? (
            <div className="mt-2 grid gap-2 lg:grid-cols-3">
              {metricCard(STUDY_REVIEW_META_TEXT.jlptMeanings, selectedItem.jlptMeta.meanings.slice(0, 6).join(" • ") || "-")}
              {metricCard(STUDY_REVIEW_META_TEXT.strokeFreq, `${selectedItem.jlptMeta.strokeCount ?? "-"} / ${selectedItem.jlptMeta.frequencyRank ?? "-"}`)}
              {metricCard(STUDY_REVIEW_META_TEXT.gradeHeisig, `${jlptGradeLabel} / ${selectedItem.jlptMeta.heisigKeyword ?? "-"}`)}
            </div>
          ) : null}

          {wordExamples.length > 0 ? (
            <div className="mt-2 rounded-xl border border-line bg-surface px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-foreground/65">{STUDY_REVIEW_META_TEXT.usedInWords}</p>
                <button
                  type="button"
                  onClick={onToggleUsedInWordsCollapsed}
                  className="rounded-full border border-line bg-surface-muted px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-foreground hover:bg-surface"
                >
                  {usedInWordsCollapsed ? STUDY_REVIEW_META_TEXT.expand : STUDY_REVIEW_META_TEXT.collapse}
                </button>
              </div>
              {!usedInWordsCollapsed ? (
                <ul className="mt-2 space-y-2 text-foreground/90">
                  {wordExamples.map((example, index) => (
                    <li
                      key={`${selectedItem.subjectId}-${example.written}-${example.pronounced}-${index}`}
                      className="rounded-lg border border-line bg-surface-muted px-3 py-2"
                    >
                      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
                        <button
                          type="button"
                          onClick={() => {
                            openSingleGlyph({
                              subjectId: -(index + 1),
                              label: example.written || "-",
                              reading: example.pronounced || null,
                              meaning: example.gloss || null,
                              subjectType: SUBJECT_TYPES.vocabulary,
                            });
                          }}
                          className={`cursor-pointer text-left font-black leading-none text-foreground hover:opacity-85 ${relatedTileLabelClass(example.written || "-")}`}
                        >
                          {example.written || "-"}
                        </button>
                        <p className="text-2xl font-bold leading-none text-foreground/80">{example.pronounced || "-"}</p>
                      </div>
                      <p className="mt-1 text-sm text-foreground/85">{example.gloss || "-"}</p>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div className="mt-2 grid gap-2 lg:grid-cols-3">
            {metricCard(STUDY_REVIEW_META_TEXT.started, formatTimestampWithRelative(selectedItem.startedAt))}
            {metricCard(STUDY_REVIEW_META_TEXT.nextReview, formatTimestampWithRelative(selectedItem.availableAt))}
            {metricCard(STUDY_REVIEW_META_TEXT.passed, formatTimestampWithRelative(selectedItem.passedAt))}
          </div>

          <div className="mt-2">
            <LevelExplorerReviewStatsCard
              accountId={accountId}
              subjectId={selectedItem.subjectId}
              currentSrsStage={selectedItem.srsStage}
              startedAt={selectedItem.startedAt}
            />
          </div>
        </>
      ) : null)}

      {isReviewQueueItem(selectedItem) && studyMode && (!requiresReveal || isAnswerRevealed) && !useStudyFlashLayout && !isOutcomeFinal ? (
        <div className="relative mt-auto grid w-full gap-2 pt-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onSubmit(selectedItem.assignmentId, STUDY_REVIEW_OUTCOMES.wrong)}
              disabled={isSubmittingSelected}
              aria-keyshortcuts="1"
              title="Wrong (Key: 1)"
              className="min-h-[4.25rem] w-full rounded-2xl border-2 border-red-300 bg-red-50 px-4 py-4 text-sm font-black uppercase tracking-[0.1em] text-red-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="block">{STUDY_REVIEW_META_TEXT.wrong}</span>
              <span className="mt-1 block text-xl leading-none">{wrong}</span>
            </button>
            <button
              type="button"
              onClick={() => onSubmit(selectedItem.assignmentId, STUDY_REVIEW_OUTCOMES.correct)}
              disabled={isSubmittingSelected}
              aria-keyshortcuts="2"
              title="Correct (Key: 2)"
              className="min-h-[4.25rem] w-full rounded-2xl border-2 border-emerald-300 bg-emerald-50 px-4 py-4 text-sm font-black uppercase tracking-[0.1em] text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="block">{STUDY_REVIEW_META_TEXT.correct}</span>
              <span className="mt-1 block text-xl leading-none">{correct}</span>
            </button>
          </div>
          <button
            type="button"
            onClick={onSkipCurrent}
            disabled={isSubmittingSelected}
            className="min-h-[4rem] w-full rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm font-black uppercase tracking-[0.1em] text-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="block">{STUDY_REVIEW_META_TEXT.skipped}</span>
            <span className="mt-1 block text-xl leading-none">{skipped}</span>
          </button>

          {isSubmittingSelected ? (
            <div className="absolute inset-0 z-20 rounded-2xl bg-surface/55 backdrop-blur-[1px]" />
          ) : null}
        </div>
      ) : null}

      {isLessonQueueItem(selectedItem) && !isOutcomeFinal ? (
        <div className="relative mt-auto w-full pt-3">
          <button
            type="button"
            onClick={() => onStartLesson(selectedItem.assignmentId)}
            disabled={isSubmittingSelected}
            className="min-h-[4.25rem] w-full rounded-2xl border-2 border-accent/50 bg-accent/10 px-4 py-4 text-base font-black uppercase tracking-[0.1em] text-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {STUDY_REVIEW_META_TEXT.addToReviews}
          </button>

          {isSubmittingSelected ? (
            <div className="absolute inset-0 z-20 rounded-2xl bg-surface/55 backdrop-blur-[1px]" />
          ) : null}
        </div>
      ) : null}

      {isLessonQueueItem(selectedItem) && isOutcomeFinal ? (
        <div className="mt-auto w-full pt-3">
          <div className="flex min-h-[4.25rem] w-full items-center justify-center rounded-2xl border-2 border-emerald-300 bg-emerald-50 px-4 py-4 text-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.1em] text-emerald-800">{STUDY_REVIEW_META_TEXT.addedToReviews}</p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-700/80">{STUDY_REVIEW_META_TEXT.alreadySubmittedHint}</p>
            </div>
          </div>
        </div>
      ) : null}

      {submitFeedback ? (
        <p className={`mt-3 rounded-xl border px-4 py-3 text-sm font-black uppercase tracking-[0.08em] ${submitFeedback.kind === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-red-300 bg-red-50 text-red-800"}`}>
          {submitFeedback.message}
        </p>
      ) : null}

    </>
  );
}
