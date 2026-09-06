import Link from "next/link";

import type { MemberBoardCopy, MemberBoardEntry } from "./memberBoardView";

/**
 * Every member board, drawn.
 *
 * A list rather than a table at every width, which is what the XP board
 * settled on and the reason is worth keeping: a row here is a placing, a name,
 * one fact and one figure, and a table of that needs a second card layout for
 * a phone that then has to be kept saying the same thing. The WaniKani board
 * earns its table - fifteen sortable columns - and is not this.
 *
 * A server component. Nothing on a row is interactive but the link to a member
 * page, so the board arrives drawn rather than after a hydration pass.
 */
export default function MemberBoardRows({
  entries,
  copy,
}: {
  entries: MemberBoardEntry[];
  copy: MemberBoardCopy;
}) {
  return (
    <ol className="divide-y divide-line/60">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 ${
            entry.isViewer ? "bg-surface-muted/60" : ""
          }`}
        >
          {/*
            * The repeats of a tie print nothing, the way SPX drew them: two
            * members on the same total are both 11th, and printing 11 twice
            * reads as a numbering bug rather than as a shared place. The place
            * still reaches a screen reader, which cannot see that the blank
            * belongs to the row above.
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
              {entry.href ? (
                <Link href={entry.href} className="hover:text-accent">
                  {entry.name}
                </Link>
              ) : (
                entry.name
              )}
              {entry.isViewer ? (
                <span className="ml-2 rounded-full border border-line px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-foreground/60">
                  {copy.you}
                </span>
              ) : null}
            </p>
            {entry.caption ? (
              <p className="truncate text-xs font-semibold text-foreground/70">{entry.caption}</p>
            ) : null}
          </div>

          {entry.detail ? <div className="w-full shrink-0 sm:w-56">{entry.detail}</div> : null}

          <div className="shrink-0 text-right sm:w-28">
            <p className="text-base font-black tabular-nums text-foreground">{entry.figure}</p>
            <p className="text-[11px] font-semibold tabular-nums text-foreground/60">
              {entry.figureNote}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
