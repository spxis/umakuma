import Link from "next/link";

import { XP_RANKS, xpForLevel } from "@/lib/xp/xpCurve";
import { xpRankBadge } from "@/lib/xp/xpRanks";

import { xpLadderNeighbours, xpLadderRows, type XpLadderRow } from "./lib/xpLadder";
import { XP_LADDER_COPY as copy } from "./xpBoardCopy";

/**
 * What every rank costs, beside the people climbing it.
 *
 * Two parts, and the first exists because of what the second cannot do. A
 * hundred rows scroll in their own box - anything else makes the standings
 * beside them a hundred rows tall - which means the one row that is marked is
 * usually the one row the reader has to go looking for. So the three rungs
 * that answer "where am I" stand above the table: the one just passed, the one
 * being stood on, and the one being climbed towards. John's fix, and it costs
 * the page no client code, where scrolling the box to the right row would have
 * been its only piece.
 *
 * The bar is drawn against the dearest rung rather than the reader's own
 * total, so the shape of the curve is visible: ten flat rungs and then ninety
 * that compound, which no column of numbers shows.
 *
 * A list rather than a table for the same reason `XpBoardRows` is one - four
 * short facts and a bar, in one shape at 393px and at 1440px.
 */
export default function XpLadderChart({ xp }: { xp: number | null }) {
  const rows = xpLadderRows(xp);
  const near = xpLadderNeighbours(rows);

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-base font-black text-foreground">{copy.title}</h2>
        <p className="mt-0.5 text-xs font-semibold leading-relaxed text-foreground/70">
          {copy.blurb}
        </p>
        <p className="mt-1 text-[11px] font-black uppercase tracking-[0.08em] tabular-nums text-foreground/60">
          {copy.shape(XP_RANKS, xpForLevel(XP_RANKS))}
        </p>
      </div>

      {near ? (
        <div className="border-b border-line bg-surface-muted/40 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-[0.08em] text-foreground/60">
            {copy.whereYouAre}
          </p>
          <ul className="mt-1.5 space-y-1.5">
            {near.previous ? <NearRung label={copy.previousRung} row={near.previous} /> : null}
            <NearRung label={copy.currentRung} row={near.here} />
            {near.next ? <NearRung label={copy.nextRung} row={near.next} /> : null}
          </ul>
        </div>
      ) : null}

      <div className="flex items-center gap-x-3 border-b border-line px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-foreground/60">
        <span className="min-w-0 flex-1">{copy.everyRung}</span>
        <span className="w-20 shrink-0 text-right">{copy.columnCost}</span>
        <span className="hidden w-24 shrink-0 text-right sm:inline">{copy.columnTotal}</span>
      </div>

      {/* Tall enough to show the shape of the ramp, short enough that the
          standings beside it stay on the same screen. */}
      <ol className="max-h-[28rem] divide-y divide-line/50 overflow-y-auto">
        {rows.map((row) => (
          <LadderRow key={row.level} row={row} />
        ))}
      </ol>
    </section>
  );
}

/**
 * One of the three rungs at the top: what it is called, what it costs, and
 * which of the three it is. Deliberately not the table's row - this one names
 * its place on the ladder, and the table's names its price.
 */
function NearRung({ label, row }: { label: string; row: XpLadderRow }) {
  const here = row.state === "here";

  return (
    <li
      title={
        here ? copy.hereTitle(row.level, row.name) : copy.aheadTitle(row.level, row.name)
      }
      className={`flex items-baseline gap-x-2 rounded-lg border px-2.5 py-1.5 ${
        here ? "border-accent bg-surface" : "border-line/70 bg-surface/60"
      }`}
    >
      <span className="w-14 shrink-0 text-[9px] font-black uppercase tracking-[0.08em] text-foreground/60">
        {label}
      </span>
      <span
        translate="no"
        className={`shrink-0 text-sm font-black tabular-nums ${here ? "text-accent" : "text-foreground/70"}`}
      >
        {xpRankBadge(row.level)}
      </span>
      <span className={`min-w-0 flex-1 truncate text-[13px] font-black ${here ? "text-foreground" : "text-foreground/80"}`}>
        {row.name}
      </span>
      <span className="shrink-0 text-[11px] font-semibold tabular-nums text-foreground/60">
        {copy.amount(row.total)}
      </span>
    </li>
  );
}

function LadderRow({ row }: { row: XpLadderRow }) {
  const here = row.state === "here";
  const ahead = row.state === "ahead";

  return (
    <li
      title={
        here
          ? copy.hereTitle(row.level, row.name)
          : row.state === "behind"
            ? copy.reachedTitle(row.level, row.name)
            : copy.aheadTitle(row.level, row.name)
      }
      className={`flex items-center gap-x-3 px-4 py-1.5 ${here ? "bg-surface-muted/60" : ""}`}
    >
      <span
        translate="no"
        className={`w-10 shrink-0 text-sm font-black tabular-nums ${here ? "text-accent" : "text-foreground/60"}`}
      >
        {xpRankBadge(row.level)}
      </span>

      <div className="min-w-0 flex-1">
        {/*
          * Every rank name is a door to the people standing on it, which is
          * what SPX's chart did and the reason a table of costs is worth
          * reading at all: the row says what a rank costs, the page behind it
          * says who is there.
          */}
        <p className={`truncate text-[13px] font-black ${ahead ? "text-foreground/70" : "text-foreground"}`}>
          <Link href={`/xp/rank/${row.level}`} className="hover:text-accent hover:underline">
            {row.name}
          </Link>
          {here ? (
            <span className="ml-2 rounded-full border border-accent px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-accent">
              {copy.here}
            </span>
          ) : null}
        </p>
        {/* The cost as a share of the dearest rank. Decorative, so it is
            hidden from a screen reader, which is being read the number. */}
        <div aria-hidden className="mt-0.5 h-1 overflow-hidden rounded-full bg-line/70">
          <div
            className={`h-full rounded-full ${here ? "bg-accent" : "bg-foreground/25"}`}
            style={{ width: `${Math.max(2, Math.round(row.share * 100))}%` }}
          />
        </div>
      </div>

      <span
        className={`w-20 shrink-0 text-right text-[13px] font-black tabular-nums ${ahead ? "text-foreground/70" : "text-foreground"}`}
      >
        {row.cost === 0 ? copy.start : copy.amount(row.cost)}
      </span>

      <span className="hidden w-24 shrink-0 text-right text-[11px] font-semibold tabular-nums text-foreground/60 sm:inline">
        {copy.amount(row.total)}
      </span>
    </li>
  );
}
