"use client";

import Link from "next/link";
import type { KeyboardEvent } from "react";

import StrokeOrderButton from "@/app/shared/StrokeOrderButton";

import { SEARCH_SOURCE_LABELS, searchHitHref, type SearchHit, type SearchSource } from "@/lib/globalSearch";
import { subjectGlyphTone } from "@/app/shared/subjectListView";

import { SEARCH_PAGE_COPY } from "./searchCopy";
import { SEARCH_RESULT_ROW_ATTR, focusSearchInput, focusSearchResultRow } from "./searchFocus";
import { JP_TEXT_CLASS } from "@/app/shared/japaneseText";

type Props = {
  hits: SearchHit[];
  /** Whose explorers a hit opens; null when nobody is signed in. */
  viewerUsername: string | null;
};

/** Source accents, so a row's origin reads before the label does. */
export const SOURCE_TONES: Record<SearchSource, string> = {
  wanikani: "border-sky-300 bg-sky-50 text-sky-700",
  jlpt: "border-emerald-300 bg-emerald-50 text-emerald-700",
  grades: "border-kanji/40 bg-kanji/10 text-kanji",
};

/**
 * Search results as one ranked list rather than three stacked ones.
 *
 * A learner asking "where does 鉛筆 live" wants the best answer first,
 * whichever catalogue holds it; grouping by source would make them read three
 * lists and compare. The source rides along as a pill instead.
 */
export default function SearchHitList({ hits, viewerUsername }: Props) {
  if (hits.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-surface-muted p-5">
        <p className="text-sm font-bold text-foreground/75">{SEARCH_PAGE_COPY.noResults}</p>
        <p className="mt-1 text-xs font-semibold text-foreground/55">{SEARCH_PAGE_COPY.noResultsHint}</p>
      </div>
    );
  }

  /*
   * The arrows walk the rows, and off the top they hand focus back to the
   * search box - the same movement that was already walking the suggestions,
   * continued into the results, so the whole search is reachable without ever
   * reaching for the mouse.
   */
  function onKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

    const row = (event.target as HTMLElement).closest<HTMLElement>(`[${SEARCH_RESULT_ROW_ATTR}]`);
    const index = Number(row?.getAttribute(SEARCH_RESULT_ROW_ATTR) ?? -1);
    if (index < 0) return;

    event.preventDefault();
    if (event.key === "ArrowUp" && index === 0) {
      focusSearchInput();
      return;
    }
    focusSearchResultRow(event.key === "ArrowDown" ? index + 1 : index - 1);
  }

  return (
    <ul
      className="overflow-hidden rounded-2xl border border-line bg-surface divide-y divide-line/60"
      onKeyDown={onKeyDown}
    >
      {hits.map((hit, index) => (
        <li key={hit.key}>
          <HitRow hit={hit} index={index} href={searchHitHref(hit, viewerUsername)} />
        </li>
      ))}
    </ul>
  );
}

function HitRow({ hit, index, href }: { hit: SearchHit; index: number; href: string | null }) {
  const body = (
    <>
          <span
            /* Three characters fit at every width; 私自身 clipped to 私 at the old w-16. */
            className={`w-20 shrink-0 truncate text-center text-2xl font-black leading-none sm:w-24 ${JP_TEXT_CLASS} ${subjectGlyphTone(
              hit.subjectType,
            )}`}
          >
            {hit.glyph}
          </span>

          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-bold text-foreground sm:text-base">
              {hit.meaning || "—"}
            </span>
            {hit.reading ? (
              <span lang="ja" translate="no" className={`truncate text-xs font-semibold text-foreground/55 ${JP_TEXT_CLASS}`}>
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
            <span className={`subject-pill border ${SOURCE_TONES[hit.source]}`}>
              {SEARCH_SOURCE_LABELS[hit.source]}
            </span>
          </span>
    </>
  );

  const shell =
    "flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left outline-none transition hover:bg-surface-muted/50 focus-visible:bg-surface-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40";
  const rowProps = { [SEARCH_RESULT_ROW_ATTR]: index };

  /*
   * The strokes button sits outside the row link. Nesting a button inside an
   * anchor is invalid, and the click would be swallowed by the navigation.
   */
  return (
    <div className="flex items-center gap-1 pr-2">
      {href ? (
        <Link href={href} className={shell} {...rowProps}>
          {body}
        </Link>
      ) : (
        /* Not a link for a signed-out reader, but still a stop for the arrows. */
        <div className={shell} tabIndex={-1} {...rowProps}>
          {body}
        </div>
      )}
      {isSingleKanji(hit) ? <StrokeOrderButton kanji={hit.glyph} meaning={hit.meaning} /> : null}
    </div>
  );
}

/** Stroke order exists for single kanji, not radicals drawn as images or words. */
function isSingleKanji(hit: SearchHit): boolean {
  return hit.subjectType === "kanji" && [...hit.glyph].length === 1;
}
