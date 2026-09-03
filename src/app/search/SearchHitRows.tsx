"use client";

import SubjectGlyph from "@/app/shared/SubjectGlyph";
import Link from "next/link";
import { type ReactNode } from "react";

import SubjectFilerCell from "@/app/shared/SubjectFilerCell";
import type { SubjectFiler } from "@/app/shared/useSubjectFiler";
import { JP_TEXT_CLASS } from "@/app/shared/japaneseText";
import { SEARCH_SOURCE_LABELS, searchHitHref, type SearchHit } from "@/lib/globalSearch";
import { rememberHit } from "@/lib/recentItems";

import { SEARCH_COL_ATTR, SEARCH_RESULT_ROW_ATTR, SEARCH_ROW_ATTR } from "./searchFocus";
import { SOURCE_TONES } from "./Search.constants";

/**
 * The rows themselves, wherever results are shown.
 *
 * One place, because there are two views of the same answer - the columns
 * side by side, and one catalogue opened on its own - and a row that looked or
 * behaved differently between them would be the same bug twice. Opening a row
 * records it in the history from here, for the same reason.
 *
 * A row carries where it sits rather than a number counted from the top of the
 * page: the columns grow at different rates as they page, and a flat index
 * would move every row below whichever column loaded.
 */



export default function SearchHitRows({
  hits,
  column = 0,
  className = "divide-y divide-line/60",
  listRef,
  trailing,
  showSource = true,
  filer = null,
}: {
  hits: SearchHit[];
  /** The open filing column, when the member has opened it. */
  filer?: SubjectFiler | null;
  /** Which column these rows are, for the arrows that cross between them. */
  column?: number;
  className?: string;
  listRef?: React.Ref<HTMLUListElement>;
  /** A last row that is not a result: the paging sentinel, the end of the list. */
  trailing?: ReactNode;
  /** Off inside a column already headed by its catalogue's name. */
  showSource?: boolean;
}) {
  return (
    <ul ref={listRef} className={className}>
      {hits.map((hit, row) => (
        <li key={hit.key}>
          <HitRow
            hit={hit}
            column={column}
            row={row}
            href={searchHitHref(hit)}
            showSource={showSource}
            filer={filer}
          />
        </li>
      ))}
      {trailing}
    </ul>
  );
}

function HitRow({
  hit,
  column,
  row,
  href,
  showSource,
  filer,
}: {
  hit: SearchHit;
  column: number;
  row: number;
  href: string | null;
  showSource: boolean;
  filer: SubjectFiler | null;
}) {
  const body = (
    <>
      {/* Three characters fit at every width; 私自身 clipped to 私 at the old w-16. */}
      <SubjectGlyph glyph={hit.glyph} subjectType={hit.subjectType} laneClassName="w-16 shrink-0 sm:w-20" />

      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-bold text-foreground sm:text-base">
          {hit.meaning || "—"}
        </span>
        {hit.reading ? (
          <span lang="ja" translate="no" className={`truncate text-xs font-semibold text-foreground/60 ${JP_TEXT_CLASS}`}>
            {hit.reading}
          </span>
        ) : null}
      </span>

      <span className="flex shrink-0 items-center gap-1">
        {hit.badges.map((badge) => (
          <span key={badge} className="subject-pill hidden border-line bg-surface text-foreground sm:inline-flex">
            {badge}
          </span>
        ))}
        {showSource ? (
          <span className={`subject-pill border ${SOURCE_TONES[hit.source]}`}>
            {SEARCH_SOURCE_LABELS[hit.source]}
          </span>
        ) : null}
      </span>
    </>
  );

  const shell =
    "flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2.5 text-left outline-none transition hover:bg-surface-muted/50 focus-visible:bg-surface-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40";
  const cellProps = {
    [SEARCH_RESULT_ROW_ATTR]: "",
    [SEARCH_COL_ATTR]: column,
    [SEARCH_ROW_ATTR]: row,
  };

  /*
   * Nothing but the row and, when filing is open, its column. The Strokes chip
   * that used to sit here bought nothing: the kanji page a row already leads
   * to opens the same animation in the same number of clicks, and four chips
   * on a row in a twenty-rem column left nothing of the row to read.
   */
  return (
    <div className="flex flex-wrap items-center gap-1 pr-2">
      {href ? (
        <Link href={href} className={shell} onClick={() => rememberHit(hit)} {...cellProps}>
          {body}
        </Link>
      ) : (
        /* Not a link where the catalogue could not name the subject; still a stop for the arrows. */
        <div className={shell} tabIndex={-1} {...cellProps}>
          {body}
        </div>
      )}
      {filer ? <SubjectFilerCell hit={hit} filer={filer} className="basis-full pb-2 pl-3" /> : null}
    </div>
  );
}
