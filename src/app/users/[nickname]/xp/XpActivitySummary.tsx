import { formatXpDay, type XpKindShare } from "./xpLedger";
import { XP_HISTORY_COPY as copy } from "./xpHistoryCopy";
import type { XpActivity } from "@/lib/xp/xpActivity";

type Props = {
  activity: XpActivity;
  byKind: XpKindShare[];
};

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface-muted p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.08em] text-foreground/60">{label}</p>
      <p className="mt-0.5 text-sm font-bold tabular-nums text-foreground">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] font-semibold text-foreground/60">{hint}</p> : null}
    </div>
  );
}

/**
 * What the ledger below adds up to.
 *
 * Every number here comes from `summariseXpActivity`, which already derives the
 * streak, the days active, the split by kind and the best day from the same
 * rows. Recomputing any of it beside the ledger would be a second answer to a
 * question that has one.
 */
export default function XpActivitySummary({ activity, byKind }: Props) {
  const lastActive =
    activity.daysSinceLastActive === null
      ? copy.lastActiveNever
      : activity.daysSinceLastActive === 0
        ? copy.lastActiveToday
        : copy.lastActiveDays(activity.daysSinceLastActive);

  return (
    <section className="space-y-4 rounded-3xl border border-line bg-surface p-5 shadow-sm">
      <h2 className="text-lg font-black text-foreground">{copy.summary}</h2>

      <div className="grid gap-2 sm:grid-cols-3">
        <Stat label={copy.streak} value={copy.days(activity.streak.current)} />
        <Stat label={copy.longestStreak} value={copy.days(activity.streak.longest)} />
        <Stat label={copy.daysActive} value={copy.days(activity.daysActive)} />
        <Stat label={copy.averagePerDay} value={copy.xpAmount(activity.averagePerActiveDay)} />
        <Stat
          label={copy.bestDay}
          value={activity.bestDay ? copy.xpAmount(activity.bestDay.amount) : copy.lastActiveNever}
          hint={activity.bestDay ? formatXpDay(activity.bestDay.dayKey) : undefined}
        />
        <Stat label={copy.lastActive} value={lastActive} />
      </div>

      {byKind.length > 0 ? (
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">
            {copy.split}
          </p>
          <ul className="mt-2 space-y-1.5">
            {byKind.map((entry) => (
              <li key={entry.kind} className="flex items-center gap-3">
                <span className="w-40 shrink-0 truncate text-xs font-bold text-foreground">
                  {entry.label}
                </span>
                <span
                  role="progressbar"
                  aria-label={entry.label}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(entry.share * 100)}
                  className="h-2 flex-1 overflow-hidden rounded-full bg-line"
                >
                  <span
                    className="block h-full rounded-full bg-accent"
                    style={{ width: `${Math.round(entry.share * 100)}%` }}
                  />
                </span>
                <span className="w-24 shrink-0 text-right text-[11px] font-black tabular-nums text-foreground/70">
                  {copy.xpAmount(entry.amount)}
                </span>
                <span className="w-10 shrink-0 text-right text-[11px] font-semibold tabular-nums text-foreground/60">
                  {copy.splitShare(entry.share)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
