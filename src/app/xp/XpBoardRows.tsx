import Link from "next/link";

import { XP_RANKS } from "@/lib/xp/xpCurve";

import { canOpenXpBoardRow, type XpBoardEntry } from "./lib/xpBoard";
import { XP_BOARD_COPY as copy } from "./xpBoardCopy";

type Props = {
  entries: XpBoardEntry[];
  viewer: { isAdmin: boolean; address: string | null; accountId: string | null };
};

/**
 * The board itself.
 *
 * A list rather than a table, because a row here is five short facts and a bar
 * rather than fifteen sortable columns — the WaniKani board earns its table and
 * this does not. It also means one shape at 393px and at 1440px instead of a
 * table and a card list that have to be kept saying the same thing.
 *
 * A server component: nothing on it is interactive except the link to a member
 * page, so it arrives drawn.
 */
export default function XpBoardRows({ entries, viewer }: Props) {
  return (
    <ol className="divide-y divide-line/60">
      {entries.map((entry) => {
        const percent = Math.round(entry.standing.ratio * 100);
        const atTop = entry.standing.level >= XP_RANKS;
        const isViewer = viewer.accountId !== null && entry.id === viewer.accountId;

        return (
          <li
            key={entry.id}
            className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 ${isViewer ? "bg-surface-muted/60" : ""}`}
          >
            {/*
              * The repeats of a tie print nothing, the way SPX drew them: two
              * members on the same total are both 11th, and printing 11 twice
              * reads as a numbering bug rather than as a shared place. The
              * place still reaches a screen reader, which cannot see that the
              * blank belongs to the row above.
              */}
            <span
              translate="no"
              className="w-10 shrink-0 text-lg font-black tabular-nums text-foreground/60"
            >
              {entry.sharesPlace ? (
                <span className="sr-only">{copy.sharedPlace(entry.place)}</span>
              ) : (
                `#${entry.place}`
              )}
            </span>

            <div className="min-w-0 flex-1 basis-40">
              <p className="truncate text-base font-black text-foreground">
                {canOpenXpBoardRow(entry, viewer) && entry.address ? (
                  <Link
                    href={`/users/${encodeURIComponent(entry.address)}/xp`}
                    className="hover:text-accent"
                  >
                    {entry.name}
                  </Link>
                ) : (
                  entry.name
                )}
                {isViewer ? (
                  <span className="ml-2 rounded-full border border-line px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-foreground/60">
                    {copy.you}
                  </span>
                ) : null}
              </p>
              <p className="truncate text-xs font-semibold text-foreground/70">{entry.rankName}</p>
            </div>

            <div className="w-full shrink-0 sm:w-56">
              <div
                role="progressbar"
                aria-label={copy.progressLabel}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                className="h-2 overflow-hidden rounded-full bg-line"
              >
                <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
              </div>
              <p className="mt-1 text-[11px] font-semibold tabular-nums text-foreground/60">
                {atTop ? copy.atTop : copy.into(entry.standing.into, entry.standing.span)}
              </p>
            </div>

            <div className="shrink-0 text-right sm:w-28">
              <p className="text-base font-black tabular-nums text-foreground">
                {copy.total(entry.xp)}
              </p>
              {/*
                * What it would take to pass the row above. Null is the leader,
                * who has nobody above; zero is a member already level with the
                * one above and needing the next point to break it. Drawing
                * both as a dash would say "nothing to do" in both cases.
                */}
              <p className="text-[11px] font-semibold tabular-nums text-foreground/60">
                {entry.toPassAbove === null
                  ? copy.leading
                  : entry.toPassAbove === 0
                    ? copy.toPassLevel
                    : copy.toPass(entry.toPassAbove)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
