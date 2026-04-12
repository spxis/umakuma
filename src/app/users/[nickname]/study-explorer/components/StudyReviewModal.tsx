import LevelExplorerDetailSection from "../../level-explorer/components/LevelExplorerDetailSection";
import type {
  ReviewOutcome,
  StudyQueueItem,
  SubmitFeedback,
  SubmitInFlight,
} from "../lib/studyExplorerTypes";

type Props = {
  selectedItem: StudyQueueItem | null;
  selectedIndex: number;
  filteredTotal: number;
  prevLabel: string | null;
  nextLabel: string | null;
  showEnglish: boolean;
  isAnswerRevealed: boolean;
  isSubmittingSelected: boolean;
  submitInFlight: SubmitInFlight | null;
  submitFeedback: SubmitFeedback | null;
  reviewOutcomeByAssignmentId: Record<number, ReviewOutcome>;
  onClose: () => void;
  onReveal: (assignmentId: number) => void;
  onSubmit: (assignmentId: number, result: "correct" | "wrong") => void;
};

export default function StudyReviewModal({
  selectedItem,
  selectedIndex,
  filteredTotal,
  prevLabel,
  nextLabel,
  showEnglish,
  isAnswerRevealed,
  isSubmittingSelected,
  submitInFlight,
  submitFeedback,
  reviewOutcomeByAssignmentId,
  onClose,
  onReveal,
  onSubmit,
}: Props) {
  if (!selectedItem) {
    return null;
  }

  let correct = 0;
  let skipped = 0;
  let wrong = 0;
  for (const outcome of Object.values(reviewOutcomeByAssignmentId)) {
    if (outcome === "correct") correct += 1;
    else if (outcome === "wrong") wrong += 1;
    else if (outcome === "skipped") skipped += 1;
  }

  return (
    <div className="fixed inset-0 z-50 bg-[rgba(8,16,36,0.72)] p-3 backdrop-blur-[2px] sm:p-6">
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-[1.8rem] border border-line bg-surface shadow-[0_26px_75px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-2 border-b border-line bg-surface-muted px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <button type="button" onClick={onClose} className="self-start rounded-full border border-line bg-surface px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-foreground hover:bg-surface-muted">Back To List</button>
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-foreground/70 sm:text-xs">#{selectedIndex + 1} of {filteredTotal}</p>
          <div className="flex items-center gap-1">
            {prevLabel ? <span className="subject-pill inline-flex h-10 items-center border-line bg-surface px-3 text-foreground">{prevLabel}</span> : null}
            {nextLabel ? <span className="subject-pill inline-flex h-10 items-center border-line bg-surface px-3 text-foreground">{nextLabel}</span> : null}
          </div>
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {isSubmittingSelected ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-surface/80 backdrop-blur-[1px]">
              <div className="inline-flex items-center gap-3 rounded-full border border-line bg-surface px-4 py-2 text-sm font-bold uppercase tracking-[0.08em] text-foreground">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
                {submitInFlight ? `Submitting ${submitInFlight.result.toUpperCase()} for ${submitInFlight.itemLabel}...` : "Submitting..."}
              </div>
            </div>
          ) : null}

          <LevelExplorerDetailSection
            selectedItem={selectedItem}
            showEnglish={showEnglish}
            studyMode
            revealStudyReading={isAnswerRevealed}
            selectedMeaningExplanation={selectedItem.meaningExplanation ?? "-"}
            selectedReadingExplanationRaw={selectedItem.readingExplanation ?? ""}
            showReadingExplanation={(selectedItem.readingExplanation ?? "").trim().length > 0}
            hasPrimaryRelatedPanel={false}
            hasVisuallySimilarPanel={false}
            hasUsedInVocabularyPanel={false}
            vocabularyKanjiLinks={[]}
            subjectById={new Map()}
            onJumpToRelatedSubject={async () => {}}
            onJumpToKanji={async () => {}}
          />

          {selectedItem.queueType === "review" ? (
            <div className="mt-3 grid w-full grid-cols-2 gap-3">
              {!isAnswerRevealed ? (
                <button type="button" onClick={() => onReveal(selectedItem.assignmentId)} className="col-span-2 w-full rounded-full border border-line bg-surface px-4 py-3 text-sm font-black uppercase tracking-[0.1em] text-foreground hover:bg-surface-muted">Show Answer</button>
              ) : null}
              <button type="button" onClick={() => onSubmit(selectedItem.assignmentId, "wrong")} className="w-full rounded-xl border border-red-300 bg-red-50 px-4 py-4 text-sm font-black uppercase tracking-[0.1em] text-red-800">Wrong</button>
              <button type="button" onClick={() => onSubmit(selectedItem.assignmentId, "correct")} className="w-full rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-4 text-sm font-black uppercase tracking-[0.1em] text-emerald-800">Correct</button>
            </div>
          ) : null}

          <div className="mt-3 grid w-full grid-cols-3 gap-3">
            <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-center"><p className="text-xs font-bold uppercase tracking-[0.12em] text-red-700/80">Wrong</p><p className="mt-1 text-3xl font-black leading-none text-red-800">{wrong}</p></div>
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-center"><p className="text-xs font-bold uppercase tracking-[0.12em] text-amber-700/80">Skipped</p><p className="mt-1 text-3xl font-black leading-none text-amber-800">{skipped}</p></div>
            <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-center"><p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-700/80">Correct</p><p className="mt-1 text-3xl font-black leading-none text-emerald-800">{correct}</p></div>
          </div>

          <div className="mt-auto pt-4">
            {submitFeedback ? (
              <p className={`rounded-xl border px-4 py-3 text-sm font-black uppercase tracking-[0.08em] ${submitFeedback.kind === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-red-300 bg-red-50 text-red-800"}`}>
                {submitFeedback.message}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
