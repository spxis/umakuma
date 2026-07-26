import type { StudyViewerMode } from "../lib/studyExplorerTypes";
import { STUDY_REVIEW_MODAL_VIEWER_MODES, STUDY_VIEWER_MODES } from "./StudyExplorer.constants";

type Props = {
  displayIndex: number;
  displayTotal: number;
  studyMode: boolean;
  viewerMode: StudyViewerMode;
  prevLabel: string | null;
  nextLabel: string | null;
  canGoPrev: boolean;
  hasNext: boolean;
  canAdvance: boolean;
  flashCycleDone: boolean;
  canUseFlashCycleNext: boolean;
  onClose: () => void;
  onSetViewerMode: (mode: StudyViewerMode) => void;
  onPrev: () => void;
  onAdvance: () => void;
};

export default function StudyReviewModalHeader({
  displayIndex,
  displayTotal,
  studyMode,
  viewerMode,
  prevLabel,
  nextLabel,
  canGoPrev,
  hasNext,
  canAdvance,
  flashCycleDone,
  canUseFlashCycleNext,
  onClose,
  onSetViewerMode,
  onPrev,
  onAdvance,
}: Props) {
  return (
    <div className="border-b border-line bg-surface-muted">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 px-2 py-2 sm:gap-2 sm:px-4 sm:py-3">
        <div className="flex min-w-0 items-center justify-start">
          <button type="button" onClick={onClose} aria-label="Close" className="h-8 cursor-pointer rounded-full border border-line bg-surface px-3 text-xs font-bold text-foreground hover:bg-surface-muted sm:h-9 sm:px-3.5 sm:text-sm">X</button>
        </div>
        <div className="flex min-w-0 flex-nowrap items-center justify-center gap-1 sm:gap-2">
          <p className="whitespace-nowrap text-xs font-bold uppercase tracking-[0.08em] text-foreground/70 sm:text-sm sm:tracking-[0.1em]">#{displayIndex} of {displayTotal}</p>
          {!studyMode ? (
            <div className="inline-flex items-center rounded-full border border-line bg-surface p-1">
              {STUDY_REVIEW_MODAL_VIEWER_MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onSetViewerMode(mode)}
                  className={`whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] sm:px-3 ${viewerMode === mode ? "bg-accent text-white" : "text-foreground hover:bg-surface-muted"}`}
                >
                  {mode === STUDY_VIEWER_MODES.detail ? "Detail" : "Flash"}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex min-w-0 items-center justify-end gap-1 sm:gap-2">
          <button
            type="button"
            onClick={onPrev}
            disabled={!canGoPrev}
            aria-label="Previous"
            title={prevLabel ? `< ${prevLabel}` : "Previous"}
            className="h-8 w-12 cursor-pointer rounded-full border border-line bg-surface text-xs font-bold text-foreground hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50 sm:h-9 sm:w-14 sm:text-sm"
          >
            {"<"}
          </button>
          <button
            type="button"
            onClick={onAdvance}
            disabled={!canAdvance}
            aria-label={hasNext ? "Next" : flashCycleDone ? "Restart" : "Next"}
            title={!hasNext && canUseFlashCycleNext ? (flashCycleDone ? "Restart" : "Next") : nextLabel ? `> ${nextLabel}` : "Next"}
            className="h-8 w-12 cursor-pointer rounded-full border border-line bg-surface text-xs font-bold text-foreground hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50 sm:h-9 sm:w-14 sm:text-sm"
          >
            {!hasNext && canUseFlashCycleNext ? (flashCycleDone ? "R" : ">") : ">"}
          </button>
        </div>
      </div>
    </div>
  );
}
