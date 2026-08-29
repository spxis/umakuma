import { isSubjectType, SUBJECT_TYPES } from "@/lib/domainConstants";
import { formatRelativeFromNow } from "@/lib/timeFormat";
import StudyHistoryAttemptMetaChips from "@/app/shared/StudyHistoryAttemptMetaChips";
import type { StudyHistoryAttempt } from "@/app/shared/studyHistoryTypes";

type Props = {
  attempts: StudyHistoryAttempt[];
  showUser: boolean;
  onSelect: (attemptId: string) => void;
};

const RESULTS = {
  correct: { mark: "✓", label: "Correct", tone: "border-emerald-500/40 bg-emerald-50 text-emerald-700" },
  wrong: { mark: "✕", label: "Wrong", tone: "border-red-500/40 bg-red-50 text-red-700" },
  skipped: { mark: "–", label: "Skipped", tone: "border-amber-500/40 bg-amber-50 text-amber-700" },
} as const;

function resultMeta(result: string) {
  if (result === "correct") return RESULTS.correct;
  if (result === "wrong") return RESULTS.wrong;
  return RESULTS.skipped;
}

function glyphTone(subjectType: string): string {
  if (!isSubjectType(subjectType)) return "text-foreground";
  if (subjectType === SUBJECT_TYPES.radical) return "text-radical";
  if (subjectType === SUBJECT_TYPES.kanji) return "text-kanji";
  return "text-vocabulary";
}

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

/** Groups consecutive attempts under the day they happened. */
function groupByDay(attempts: StudyHistoryAttempt[]): Array<{ day: string; rows: StudyHistoryAttempt[] }> {
  const groups: Array<{ day: string; rows: StudyHistoryAttempt[] }> = [];
  for (const attempt of attempts) {
    const day = dayKey(attempt.submittedAt);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.rows.push(attempt);
    else groups.push({ day, rows: [attempt] });
  }
  return groups;
}

/**
 * Study history as a timeline rather than a table.
 *
 * The old layout repeated the date on every row, printed the meaning twice (once
 * inside the glyph tile and once beside it), and parked the result at the far
 * right of a wide row, so the eye had to travel the width of the screen to pair
 * an item with its outcome. Here the date is a heading over the attempts it
 * covers, the result leads each row in a fixed lane so a run of wrong answers is
 * visible at a glance, and each row is one line tall.
 */
export default function StudyHistoryRows({ attempts, showUser, onSelect }: Props) {
  if (attempts.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      {groupByDay(attempts).map((group) => (
        <section key={group.day}>
          <h3 className="sticky top-0 z-10 flex items-baseline justify-between gap-3 border-b border-line bg-surface-muted px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-foreground/60">
            <span>{group.day}</span>
            <span className="font-bold tracking-normal text-foreground/45">{group.rows.length}</span>
          </h3>
          <ul className="divide-y divide-line/50">
            {group.rows.map((row) => {
              const meta = resultMeta(row.result);
              const meaning = row.subjectMeaning?.trim() || "—";
              const reading = row.subjectReading?.trim();
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(row.id)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-surface-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40"
                  >
                    <span
                      aria-hidden="true"
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-black ${meta.tone}`}
                    >
                      {meta.mark}
                    </span>
                    <span className="sr-only">{meta.label}</span>

                    <span className={`w-10 shrink-0 truncate text-center text-2xl font-black leading-none [font-family:var(--font-jp-current)] ${glyphTone(row.subjectType)}`}>
                      {row.subjectLabel}
                    </span>

                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-bold text-foreground sm:text-base">{meaning}</span>
                      <span className="flex items-center gap-1.5 truncate text-xs font-semibold text-foreground/55">
                        {reading ? <span className="[font-family:var(--font-jp-current)]">{reading}</span> : null}
                        {showUser ? <span className="truncate">{row.nickname}</span> : null}
                        <span className="sm:hidden">{clockTime(row.submittedAt)}</span>
                      </span>
                    </span>

                    <StudyHistoryAttemptMetaChips
                      subjectType={row.subjectType}
                      wkLevel={typeof row.wkLevel === "number" ? row.wkLevel : null}
                      srsStage={typeof row.srsStage === "number" ? row.srsStage : null}
                      srsBucket={row.srsBucket}
                      compact
                      className="hidden shrink-0 items-center gap-1 md:flex"
                    />

                    <span className="hidden w-24 shrink-0 text-right text-xs font-semibold text-foreground/55 sm:block">
                      <span className="block">{clockTime(row.submittedAt)}</span>
                      <span className="block text-[10px] uppercase tracking-[0.08em] text-foreground/40">
                        {formatRelativeFromNow(row.submittedAt, { style: "short", allowFuture: false, noValueLabel: "-", invalidLabel: "-" })}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
