import type { ReviewOutcome, StudyReviewSubmitResult } from "../lib/studyExplorerTypes";
import { STUDY_REVIEW_MODAL_SECTION_TEXT } from "./StudyExplorer.constants";
import StudyReviewFlashActionRow from "./StudyReviewFlashActionRow";
import FieldLabel from "../../../../shared/FieldLabel";
import CrossSystemName from "@/app/shared/CrossSystemName";
import { noTranslateClass } from "@/app/shared/japaneseText";
import { LEVEL_SYSTEMS } from "@/lib/levelBadge";

type Props = {
  allMeanings: string[];
  fallbackMeaning: string;
  primaryReadingHiragana: string;
  primaryReadingKatakana: string;
  secondaryReadingValue: string;
  selectedMeaningExplanation: string;
  selectedReadingExplanationRaw: string;
  /** WaniKani's own word for this radical, for a member who may read it. */
  wanikaniName?: string | null;
  /** Ours, when the card being read is WaniKani's. */
  umakumaName?: string | null;
  /** A radical has no reading, so it is not asked for one. */
  hasReading: boolean;
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
  wanikaniName,
  umakumaName,
  hasReading,
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
        {/* A radical is a shape, not a sound: it has no reading and never
            will, so the panel is absent rather than drawn holding a dash.
            It was the first thing on the card and it was always empty. */}
        {hasReading ? (
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
        ) : null}

        <section className={hasReading ? "mt-3 border-t border-line/70 pt-3" : ""}>
          <FieldLabel size="xs" tone="muted">
            {STUDY_REVIEW_MODAL_SECTION_TEXT.meaning}
          </FieldLabel>
          <p className="mt-1 text-2xl font-black leading-tight text-foreground sm:text-4xl">
            {allMeanings[0] ?? fallbackMeaning}
          </p>
          {/* The same shape under the name a WaniKani member learned it by,
              directly under ours rather than at the bottom of the card: the
              two names answer the same question and belong together. */}
          <CrossSystemName system={LEVEL_SYSTEMS.wanikani} name={wanikaniName} className="mt-2" />
          {/* And the mirror: our name, when the feed being read is theirs.
              Only ever one of the two is filled - a card belongs to one
              system and names the other. */}
          <CrossSystemName system={LEVEL_SYSTEMS.umakuma} name={umakumaName} className="mt-2" />
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
