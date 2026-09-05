import { XP_HISTORY_COPY as copy } from "./xpHistoryCopy";
import type { XpLedgerDay } from "./xpLedger";

type Props = { days: XpLedgerDay[] };

/**
 * The ledger: a day, what it was worth, and which kinds made it up.
 *
 * The day is the heading rather than a column, because the day is the unit the
 * data has. A row underneath is one kind's whole earning of that day — the
 * `XpEvent` row accumulates — so it is never drawn with a time beside it, and
 * the hint above says so once rather than the layout implying otherwise on
 * every line.
 *
 * The note under an amount is the point of the screen. Every kind carries a
 * sentence written for exactly this reader, and a particular award may carry
 * its own on top of it, so "+50 XP" is never left as a number nobody can
 * account for.
 */
export default function XpLedgerDays({ days }: Props) {
  return (
    <ol className="space-y-3">
      {days.map((day) => (
        <li key={day.dayKey} className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-line bg-surface-muted/50 px-4 py-2">
            <p className="text-sm font-black text-foreground">{day.label}</p>
            <div className="flex shrink-0 items-baseline gap-3">
              <p className="text-sm font-black tabular-nums text-accent">{copy.xpGain(day.total)}</p>
              <p className="text-[11px] font-semibold tabular-nums text-foreground/60">
                {copy.runningTotal(day.runningTotal)}
              </p>
            </div>
          </div>

          <ul className="divide-y divide-line/60">
            {day.entries.map((entry) => (
              <li key={entry.kind} className="flex items-start gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground">{entry.label}</p>
                  {/* The kind's own sentence, then this day's own note where
                      the caller wrote one. Both, when both exist: the first
                      says what the kind is, the second which one it was. */}
                  {entry.typeNote ? (
                    <p className="text-[11px] font-semibold leading-relaxed text-foreground/60">
                      {entry.typeNote}
                    </p>
                  ) : null}
                  {entry.note ? (
                    <p className="mt-0.5 text-[11px] font-bold leading-relaxed text-foreground/70">
                      {entry.note}
                    </p>
                  ) : null}
                </div>
                <p className="shrink-0 text-sm font-black tabular-nums text-foreground">
                  {copy.xpGain(entry.amount)}
                </p>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
