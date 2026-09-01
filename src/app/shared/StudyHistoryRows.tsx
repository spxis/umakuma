import { formatRelativeFromNow } from "@/lib/timeFormat";
import SubjectCards from "@/app/shared/SubjectCards";
import SubjectRows from "@/app/shared/SubjectRows";
import type { SubjectSelection } from "@/app/shared/useSubjectSelection";
import {
  SUBJECT_VIEW_MODES,
  type SubjectListRow,
  type SubjectViewMode,
} from "@/app/shared/subjectListView";
import type { StudyHistoryAttempt } from "@/app/shared/studyHistoryTypes";
import { resultMeta } from "@/app/shared/studyHistoryUi";

type Props = {
  /** Choosing, passed through to whichever density is showing. */
  selection?: SubjectSelection;
  attempts: StudyHistoryAttempt[];
  showUser: boolean;
  onSelect: (attemptId: string) => void;
  viewMode?: SubjectViewMode;
};

/** A history row is a subject plus the attempt it came from. */
type HistoryRow = SubjectListRow & { attempt: StudyHistoryAttempt };

function dayKey(submittedAt: string): string {
  const date = new Date(submittedAt);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function clockTime(submittedAt: string): string {
  const date = new Date(submittedAt);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
    .format(date)
    .toLowerCase();
}

function toRow(attempt: StudyHistoryAttempt): HistoryRow {
  return {
    key: attempt.id,
    subjectId: attempt.subjectId,
    subjectType: attempt.subjectType,
    glyph: attempt.subjectLabel,
    meaning: attempt.subjectMeaning?.trim() ?? "",
    reading: attempt.subjectReading?.trim() || null,
    wkLevel: typeof attempt.wkLevel === "number" ? attempt.wkLevel : null,
    srsStage: typeof attempt.srsStage === "number" ? attempt.srsStage : null,
    srsBucket: attempt.srsBucket,
    attempt,
  };
}

/** The correct/wrong/skipped mark, in the fixed lane that leads each row. */
function ResultMark({ result }: { result: string }) {
  const meta = resultMeta(result);
  return (
    <>
      <span
        aria-hidden="true"
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-black ${meta.tone}`}
      >
        {meta.mark}
      </span>
      <span className="sr-only">{meta.label}</span>
    </>
  );
}

/**
 * Study history, as either a timeline or a grid of cards.
 *
 * The rows and cards are the shared subject renderers, so history and the
 * tagged lists stay identical to read. What belongs only to history is passed
 * in as slots: the day heading rows group under, the result mark leading each
 * row so a run of wrong answers is visible straight down the page, and the time
 * trailing it. The date is a heading over the attempts it covers rather than a
 * column repeated on every row.
 */
export default function StudyHistoryRows({
  attempts,
  showUser,
  onSelect,
  viewMode = SUBJECT_VIEW_MODES.list,
  selection,
}: Props) {
  const rows = attempts.map(toRow);

  if (viewMode === SUBJECT_VIEW_MODES.grid) {
    return (
      <SubjectCards<HistoryRow>
        rows={rows}
        onSelect={(row) => onSelect(row.attempt.id)}
        renderBadge={(row) => <ResultMark result={row.attempt.result} />}
        selection={selection}
      />
    );
  }

  return (
    <SubjectRows<HistoryRow>
      rows={rows}
      onSelect={(row) => onSelect(row.attempt.id)}
      selection={selection}
      groupBy={(row) => dayKey(row.attempt.submittedAt)}
      renderLeading={(row) => <ResultMark result={row.attempt.result} />}
      renderSubMeta={(row) => (
        <>
          {showUser ? <span className="truncate">{row.attempt.nickname}</span> : null}
          <span className="sm:hidden">{clockTime(row.attempt.submittedAt)}</span>
        </>
      )}
      renderTrailing={(row) => (
        <span className="hidden w-24 shrink-0 pr-1 text-right text-xs font-semibold text-foreground/60 sm:block">
          <span className="block">{clockTime(row.attempt.submittedAt)}</span>
          <span className="block text-[10px] uppercase tracking-[0.08em] text-foreground/60">
            {formatRelativeFromNow(row.attempt.submittedAt, {
              style: "short",
              allowFuture: false,
              noValueLabel: "-",
              invalidLabel: "-",
            })}
          </span>
        </span>
      )}
    />
  );
}
