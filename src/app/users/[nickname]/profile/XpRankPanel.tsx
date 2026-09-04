import { japaneseTextProps } from "@/app/shared/japaneseText";
import { XP_RANKS, xpStanding } from "@/lib/xp/xpCurve";
import { xpRank } from "@/lib/xp/xpRanks";

import { XP_RANK_COPY as copy } from "./profileCopy";

/**
 * Where a member stands on the XP ladder.
 *
 * The sibling of `ThemePicker` on this page, and built the same way: it owns
 * its whole card, states what the thing is before showing it, and puts the
 * standing itself in an inset box the way the ladder on now sits in one.
 *
 * The rank is derived from the XP rather than read from `Account.xpLevel`. The
 * stored level is a materialised number and this page is the one place a
 * member would notice it disagreeing with the total beside it, so the total
 * wins - the same reasoning `xpServer.ts` gives for writing it in one place.
 *
 * Nothing here is interactive, so it is a server component: the rank arrives
 * drawn rather than after a fetch for a number the page already had.
 */
export default function XpRankPanel({ xp }: { xp: number }) {
  const standing = xpStanding(xp);
  const rank = xpRank(standing.level);
  const atTop = standing.level >= XP_RANKS;
  const next = atTop ? null : xpRank(standing.level + 1);
  const percent = Math.round(standing.ratio * 100);

  return (
    <section className="space-y-4 rounded-3xl border border-line bg-surface p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-black text-foreground">{copy.heading}</h2>
        <p className="mt-1 text-sm font-semibold leading-relaxed text-foreground/70">{copy.blurb}</p>
      </div>

      <div className="rounded-2xl border border-line bg-surface-muted/40 p-3">
        <p className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">{copy.standing}</p>
        <div className="mt-0.5 flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-black text-foreground">{rank.name}</p>
          <p className="shrink-0 text-[11px] font-black tabular-nums text-foreground/60">
            {copy.rankOf(standing.level, XP_RANKS)}
          </p>
        </div>

        <div
          role="progressbar"
          aria-label={copy.progressLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="mt-2 h-2 overflow-hidden rounded-full bg-line"
        >
          <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
        </div>

        <p className="mt-1.5 text-[11px] font-semibold text-foreground/60">
          {atTop ? copy.atTop : copy.into(standing.into, standing.span)}
        </p>
      </div>

      {next ? (
        <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-2xl border border-line bg-surface p-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">{copy.next}</p>
            <p className="mt-0.5 text-sm font-black text-foreground">{next.name}</p>
          </div>
          <p className="shrink-0 text-[11px] font-black tabular-nums text-foreground/60">{copy.toNext(standing.toNext)}</p>
        </div>
      ) : null}

      {/* The same rank in the other traditions it was named from. Quiet, and
          absent entirely until the names have been written. */}
      {rank.equivalents.length > 0 ? (
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">{copy.equivalents}</p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {rank.equivalents.map((equivalent) => (
              <li
                key={`${equivalent.language}-${equivalent.name}`}
                title={equivalent.note.length > 0 ? `${equivalent.language} — ${equivalent.note}` : equivalent.language}
                className="rounded-lg border border-line bg-surface-muted px-2 py-1"
              >
                <span {...japaneseTextProps("block truncate text-[13px] font-black leading-tight text-foreground")}>
                  {equivalent.name}
                </span>
                <span className="block truncate text-[9px] font-semibold text-foreground/60">
                  {equivalent.reading ?? equivalent.language}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-[11px] font-semibold tabular-nums text-foreground/60">{copy.total(xp)}</p>
    </section>
  );
}
