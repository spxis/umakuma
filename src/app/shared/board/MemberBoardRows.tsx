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
    /*
     * A container query, not a viewport one. The board sits in a half-width
     * column on the XP page and full width elsewhere, and `sm:` asks the
     * *window* how wide it is - so at 1440 the lanes claimed 536px of a 580px
     * column and the row broke into three ragged lines with the figure
     * stranded under the bar. `@container` asks the column.
     */
    <ol className="@container divide-y divide-line/60">
      {entries.map((entry) => (
        <li
          key={entry.id}
          /*
           * Narrow: place, name and figure on one line, the bar spanning
           * underneath. Wide enough and it is all one line, which is what the
           * board looked like before and is worth keeping where there is room.
           * A grid rather than wrapping flex, so the figure stays hard right
           * at both shapes instead of landing wherever the wrap left it.
           */
          className={`grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-4 py-3 @[34rem]:grid-cols-[2.5rem_minmax(0,1fr)_14rem_auto] ${
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

          {/* Under the name on a narrow board, in its own lane on a wide one. */}
          {entry.detail ? (
            <div className="col-start-2 col-span-2 min-w-0 @[34rem]:col-start-3 @[34rem]:col-span-1">
              {entry.detail}
            </div>
          ) : null}

          <div className="col-start-3 row-start-1 shrink-0 text-right @[34rem]:col-start-4 @[34rem]:row-start-1">
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
