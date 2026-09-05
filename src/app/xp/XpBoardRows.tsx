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
            <span
              translate="no"
              className="w-10 shrink-0 text-lg font-black tabular-nums text-foreground/60"
            >
              {`#${entry.place}`}
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

            <p className="shrink-0 text-right text-base font-black tabular-nums text-foreground sm:w-28">
              {copy.total(entry.xp)}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
