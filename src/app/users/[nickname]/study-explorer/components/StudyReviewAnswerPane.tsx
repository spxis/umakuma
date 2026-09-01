import type { ReviewOutcome, StudyReviewSubmitResult } from "../lib/studyExplorerTypes";
import { STUDY_REVIEW_MODAL_SECTION_TEXT } from "./StudyExplorer.constants";
import StudyReviewFlashActionRow from "./StudyReviewFlashActionRow";
import FieldLabel from "../../../../shared/FieldLabel";
import { noTranslateClass } from "@/app/shared/japaneseText";

type Props = {
  allMeanings: string[];
  fallbackMeaning: string;
  primaryReadingHiragana: string;
  primaryReadingKatakana: string;
  secondaryReadingValue: string;
  selectedMeaningExplanation: string;
  selectedReadingExplanationRaw: string;
  isPracticeItem: boolean;
  assignmentId: number;
  selectedOutcome: ReviewOutcome | undefined;
  isOutcomeFinal: boolean;
  wrong: number;
  skipped: number;
  correct: number;
  isSubmittingSelected: boolean;
  onSubmit: (assignmentId: number, result: StudyReviewSubmitResult) => void;
  onSkipCurrent: () => void;
};

export default function StudyReviewAnswerPane({
  allMeanings,
  fallbackMeaning,
  primaryReadingHiragana,
  primaryReadingKatakana,
  secondaryReadingValue,
  selectedMeaningExplanation,
  selectedReadingExplanationRaw,
  isPracticeItem,
  assignmentId,
  selectedOutcome,
  isOutcomeFinal,
  wrong,
  skipped,
  correct,
  isSubmittingSelected,
  onSubmit,
  onSkipCurrent,
}: Props) {
  const primaryReading =
    primaryReadingHiragana === "-" && secondaryReadingValue !== "-"
      ? secondaryReadingValue
      : primaryReadingHiragana;
  const hasAltMeanings = allMeanings.length > 1;
  const hasMeaningExplanation = selectedMeaningExplanation !== "-";
  const hasReadingExplanation = selectedReadingExplanationRaw.length > 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-line bg-surface px-3 py-2.5 sm:px-4 sm:py-3">
        <section>
          <FieldLabel size="xs" tone="muted">
            {STUDY_REVIEW_MODAL_SECTION_TEXT.reading}
          </FieldLabel>
          {/* Both scripts of the reading, which is the answer being revealed. */}
          <div lang="ja" translate="no" className={noTranslateClass("mt-1 flex min-w-0 items-end gap-2")}>
            <p className="text-2xl font-black leading-tight text-foreground sm:text-4xl">{primaryReading}</p>
            {primaryReadingKatakana !== "-" ? (
              <p className="text-xs font-semibold leading-tight text-foreground/70 sm:text-sm">
                {primaryReadingKatakana}
              </p>
            ) : null}
          </div>
        </section>

        <section className="mt-3 border-t border-line/70 pt-3">
          <FieldLabel size="xs" tone="muted">
            {STUDY_REVIEW_MODAL_SECTION_TEXT.meaning}
          </FieldLabel>
          <p className="mt-1 text-2xl font-black leading-tight text-foreground sm:text-4xl">
            {allMeanings[0] ?? fallbackMeaning}
          </p>
          {hasAltMeanings ? (
            <div className="mt-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-foreground/60">
                {STUDY_REVIEW_MODAL_SECTION_TEXT.altMeanings}
              </p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/80 sm:text-xs">
                {allMeanings.slice(1).join(" • ")}
              </p>
            </div>
          ) : null}
          {hasMeaningExplanation ? (
            <div className="mt-3 text-[11px] leading-relaxed text-foreground/75">
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-foreground/60">Meaning note</p>
              <p className="mt-1">{selectedMeaningExplanation}</p>
            </div>
          ) : null}
          {hasReadingExplanation ? (
            <div className="mt-3 text-[11px] leading-relaxed text-foreground/75">
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-foreground/60">Reading note</p>
              <p className="mt-1">{selectedReadingExplanationRaw}</p>
            </div>
          ) : null}
        </section>
      </div>

      <StudyReviewFlashActionRow
        isPracticeItem={isPracticeItem}
        assignmentId={assignmentId}
        selectedOutcome={selectedOutcome}
        readOnly={isOutcomeFinal}
        wrong={wrong}
        skipped={skipped}
        correct={correct}
        isSubmittingSelected={isSubmittingSelected}
        onSubmit={onSubmit}
        onSkipCurrent={onSkipCurrent}
      />
    </div>
  );
}
