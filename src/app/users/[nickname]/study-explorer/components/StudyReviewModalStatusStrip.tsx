import {
  isReviewQueueItem,
  STUDY_REVIEW_MODAL_SECTION_TEXT,
} from "./StudyExplorer.constants";
import type { StudyQueueItem } from "../lib/studyExplorerTypes";

type Props = {
  studyMode: boolean;
  selectedItem: StudyQueueItem;
  isPracticeItem: boolean;
  wrong: number;
  skipped: number;
  correct: number;
};

export default function StudyReviewModalStatusStrip({
  studyMode,
  selectedItem,
  isPracticeItem,
  wrong,
  skipped,
  correct,
}: Props) {
  if (!studyMode || !isReviewQueueItem(selectedItem)) {
    return null;
  }

  if (isPracticeItem) {
    return (
      <div className="border-b border-line/70 bg-sky-50 px-4 py-2 text-center sm:px-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-sky-800">
          {STUDY_REVIEW_MODAL_SECTION_TEXT.troublePractice}
        </p>
        <p className="mt-1 text-[11px] font-semibold text-sky-900/80">
          {STUDY_REVIEW_MODAL_SECTION_TEXT.troublePracticeHint}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 border-b border-line/70 bg-surface">
      <div className="border-r border-red-200 bg-red-50 py-1 text-center text-[10px] font-bold uppercase tracking-[0.08em] text-red-800">
        Wrong {wrong}
      </div>
      <div className="border-r border-amber-200 bg-amber-50 py-1 text-center text-[10px] font-bold uppercase tracking-[0.08em] text-amber-800">
        Skipped {skipped}
      </div>
      <div className="bg-emerald-50 py-1 text-center text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-800">
        Correct {correct}
      </div>
    </div>
  );
}