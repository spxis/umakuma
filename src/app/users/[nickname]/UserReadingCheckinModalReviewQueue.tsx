import type { ReadingReviewQueueSnapshot } from "@/lib/readingSignoff";
import { SUBJECT_TYPES } from "@/lib/domainConstants";
import { subjectTypePluralLabel } from "./shared/subjectTypeLabels";
import { ExplorerPill, SubjectTypePill } from "./shared/ExplorerPill";

type UserReadingCheckinModalReviewQueueProps = {
  selectedReviewQueue: ReadingReviewQueueSnapshot;
};

export default function UserReadingCheckinModalReviewQueue({
  selectedReviewQueue,
}: UserReadingCheckinModalReviewQueueProps) {
  const zeroReviewsBonusActive = selectedReviewQueue.total === 0;

  return (
    <section className="mt-3 rounded-xl border border-line bg-surface-muted p-3">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-foreground/65">Current review queue snapshot</p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-foreground/85">
        <SubjectTypePill type={SUBJECT_TYPES.radical}>
          {subjectTypePluralLabel(SUBJECT_TYPES.radical)} left: {selectedReviewQueue.radical}
        </SubjectTypePill>
        <SubjectTypePill type={SUBJECT_TYPES.kanji}>
          {subjectTypePluralLabel(SUBJECT_TYPES.kanji)} left: {selectedReviewQueue.kanji}
        </SubjectTypePill>
        <SubjectTypePill type={SUBJECT_TYPES.vocabulary}>
          {subjectTypePluralLabel(SUBJECT_TYPES.vocabulary)} left: {selectedReviewQueue.vocabulary}
        </SubjectTypePill>
        {zeroReviewsBonusActive ? (
          <ExplorerPill className="border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold tracking-[0.08em] text-emerald-700">
            0-review credit ready
          </ExplorerPill>
        ) : null}
      </div>
      <p className={`mt-1 text-xs ${zeroReviewsBonusActive ? "text-emerald-700" : "text-foreground/70"}`}>
        {zeroReviewsBonusActive
          ? "Special bonus active: review queue is at 0."
          : `${selectedReviewQueue.total} total reviews currently due.`}
      </p>
      <p className="mt-1 text-[11px] text-foreground/65">
        Review credit is granted only when this total is 0 at save time.
      </p>
    </section>
  );
}
