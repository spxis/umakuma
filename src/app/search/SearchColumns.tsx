"use client";

import Link from "next/link";

import { SEARCH_SOURCE_LABELS, type SearchHit, type SearchSource } from "@/lib/globalSearch";

import SearchHitRows from "./SearchHitRows";
import { COLUMN_MAX_HEIGHT, SOURCE_TONES } from "./Search.constants";
import { useSearchGridKeys } from "./useSearchGridKeys";
import { SEARCH_PAGE_COPY } from "./searchCopy";

/**
 * The answer as one column per catalogue.
 *
 * One ranked column answered "here is everything, best first", which is right
 * and not enough. Four catalogues answer a common character at once and they
 * answer differently: WaniKani knows what you are learning it as, the school
 * grades know when a child is taught it, the dictionary knows the characters
 * nobody teaches. Interleaving them by score makes the reader sort that out
 * row by row from a pill. Side by side, each catalogue's answer is a column
 * you can read or ignore in one glance.
 *
 * The columns are ragged on purpose - WaniKani gives forty rows where the
 * grades give one - so the arrows clamp rather than pretending the grid is
 * square. That maths is in `searchGrid`, tested away from the DOM.
 */



export type ResultColumn = {
  source: SearchSource;
  hits: SearchHit[];
  /** Everything the catalogue found, which may be more than is shown. */
  total: number;
  /** That catalogue on its own, in full. */
  moreHref: string;
};

export default function SearchColumns({ columns }: { columns: ResultColumn[] }) {
  const onKeyDown = useSearchGridKeys({
    lengths: columns.map((column) => column.hits.length),
  });

  if (columns.length === 0) return null;

  return (
    <div
      onKeyDown={onKeyDown}
      /*
       * One column does not take the whole page. Stretched to 1,400 pixels a
       * row puts its glyph at one edge and its pills at the other, with the
       * meaning stranded between them; the columns only earn the width when
       * there are several of them.
       */
      className={
        columns.length === 1
          ? "grid max-w-3xl items-start gap-3"
          : "grid items-start gap-3 lg:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(20rem,1fr))]"
      }
    >
      {columns.map((column, index) => {
        const rest = column.total - column.hits.length;

        return (
          <section
            key={column.source}
            className="overflow-hidden rounded-2xl border border-line bg-surface"
          >
            <header className="flex items-center justify-between gap-3 border-b border-line bg-surface-muted px-3 py-2">
              <h2 className="flex items-center gap-2">
                <span className={`subject-pill border ${SOURCE_TONES[column.source]}`}>
                  {SEARCH_SOURCE_LABELS[column.source]}
                </span>
                <span
                  translate="no"
                  className="text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/60"
                >
                  {column.total}
                </span>
              </h2>
              {rest > 0 ? (
                <Link
                  href={column.moreHref}
                  className="text-[11px] font-bold uppercase tracking-[0.08em] text-accent underline decoration-dotted underline-offset-2"
                >
                  {SEARCH_PAGE_COPY.seeAllInKind(rest)}
                </Link>
              ) : null}
            </header>

            {/* The catalogue is in the heading, so every row repeating it is noise. */}
            <SearchHitRows
              hits={column.hits}
              column={index}
              showSource={false}
              className={`${COLUMN_MAX_HEIGHT} divide-y divide-line/60 overflow-y-auto overscroll-contain`}
            />
          </section>
        );
      })}
    </div>
  );
}
