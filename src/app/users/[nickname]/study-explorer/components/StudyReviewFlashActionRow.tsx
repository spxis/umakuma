import { STUDY_REVIEW_OUTCOMES, STUDY_REVIEW_MODAL_SECTION_TEXT } from "./StudyExplorer.constants";
import type { ReviewOutcome } from "../lib/studyExplorerTypes";

type Props = {
  isPracticeItem: boolean;
  assignmentId: number;
  selectedOutcome?: ReviewOutcome;
  readOnly?: boolean;
  wrong: number;
  skipped: number;
  correct: number;
  isSubmittingSelected: boolean;
  onSubmit: (assignmentId: number, result: "wrong" | "correct") => void;
  onSkipCurrent: () => void;
};

export default function StudyReviewFlashActionRow({
  isPracticeItem,
  assignmentId,
  selectedOutcome,
  readOnly = false,
  wrong,
  skipped,
  correct,
  isSubmittingSelected,
  onSubmit,
  onSkipCurrent,
}: Props) {
  return (
    <div className="mt-2 grid shrink-0 grid-cols-3 gap-2">
      <button
        type="button"
        onClick={() => onSubmit(assignmentId, STUDY_REVIEW_OUTCOMES.wrong)}
        disabled={isSubmittingSelected || readOnly}
        aria-pressed={selectedOutcome === STUDY_REVIEW_OUTCOMES.wrong}
        aria-keyshortcuts="1"
        title={isPracticeItem ? "Again (Key: 1)" : "Wrong (Key: 1)"}
        className={`min-h-20 w-full cursor-pointer rounded-2xl border-2 border-red-300 bg-red-50 px-2 py-2 text-xs font-black uppercase tracking-[0.1em] text-red-800 transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:cursor-not-allowed sm:min-h-24 sm:px-3 sm:text-sm ${selectedOutcome === STUDY_REVIEW_OUTCOMES.wrong ? "ring-4 ring-red-300" : readOnly ? "opacity-40" : "disabled:opacity-50"}`}
      >
        <span className="block">{isPracticeItem ? STUDY_REVIEW_MODAL_SECTION_TEXT.practiceAgain : STUDY_REVIEW_MODAL_SECTION_TEXT.wrong}</span>
        {!isPracticeItem ? <span className="mt-1 block text-3xl leading-none sm:text-[2rem]">{wrong}</span> : null}
      </button>
      <button
        type="button"
        onClick={onSkipCurrent}
        disabled={isSubmittingSelected || readOnly}
        className={`min-h-20 w-full cursor-pointer rounded-2xl border-2 border-amber-300 bg-amber-50 px-2 py-2 text-xs font-black uppercase tracking-[0.1em] text-amber-800 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:cursor-not-allowed sm:min-h-24 sm:px-3 sm:text-sm ${readOnly ? "opacity-40" : "disabled:opacity-50"}`}
      >
        <span className="block">{isPracticeItem ? STUDY_REVIEW_MODAL_SECTION_TEXT.practiceLater : STUDY_REVIEW_MODAL_SECTION_TEXT.skipped}</span>
        {!isPracticeItem ? <span className="mt-1 block text-3xl leading-none sm:text-[2rem]">{skipped}</span> : null}
      </button>
      <button
        type="button"
        onClick={() => onSubmit(assignmentId, STUDY_REVIEW_OUTCOMES.correct)}
        disabled={isSubmittingSelected || readOnly}
        aria-pressed={selectedOutcome === STUDY_REVIEW_OUTCOMES.correct}
        aria-keyshortcuts="2"
        title={isPracticeItem ? "Done (Key: 2)" : "Correct (Key: 2)"}
        className={`min-h-20 w-full cursor-pointer rounded-2xl border-2 border-emerald-300 bg-emerald-50 px-2 py-2 text-xs font-black uppercase tracking-[0.1em] text-emerald-800 transition-colors hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:cursor-not-allowed sm:min-h-24 sm:px-3 sm:text-sm ${selectedOutcome === STUDY_REVIEW_OUTCOMES.correct ? "ring-4 ring-emerald-300" : readOnly ? "opacity-40" : "disabled:opacity-50"}`}
      >
        <span className="block">{isPracticeItem ? STUDY_REVIEW_MODAL_SECTION_TEXT.practiceDone : STUDY_REVIEW_MODAL_SECTION_TEXT.correct}</span>
        {!isPracticeItem ? <span className="mt-1 block text-3xl leading-none sm:text-[2rem]">{correct}</span> : null}
      </button>
    </div>
  );
}
