"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";

import {
  RECENT_SEARCH_VISIBLE,
  forgetAllSearches,
  forgetSearch,
  recentSearchesServerSnapshot,
  recentSearchesSnapshot,
  rememberSearch,
  subscribeRecentSearches,
} from "@/lib/recentSearches";

import { SEARCH_PAGE_COPY } from "./searchCopy";
import { SEARCH_LIST_CARD } from "./SearchHitList";

/**
 * The searches this browser has run, as the last rows of the results list.
 *
 * Looking a kanji up is rarely a single act - you check 家, then 家事, then go
 * back to 家 - and retyping it each time is the whole friction. These are rows
 * in the same list rather than a card of their own, because they are read in
 * the same downward sweep as the results; a titled band separates them, since
 * a previous search is a way back rather than an answer.
 *
 * The list is read through a store subscription rather than into state after
 * mount: the server has no idea what this browser remembers, and rendering a
 * guess would flash the wrong thing before correcting itself.
 */
export default function RecentSearches({
  currentQuery,
  variant = "rows",
}: {
  currentQuery: string;
  /** "rows" closes out the results list; "card" stands alone when there is none. */
  variant?: "rows" | "card";
}) {
  const history = useSyncExternalStore(
    subscribeRecentSearches,
    recentSearchesSnapshot,
    recentSearchesServerSnapshot,
  );

  /* Arriving at a set of results is what makes a search worth remembering. */
  useEffect(() => {
    rememberSearch(currentQuery);
  }, [currentQuery]);

  if (history.length === 0) return null;

  const rows = (
    <>
      <li className="flex items-center justify-between gap-3 bg-surface-muted px-4 py-2">
        <h2 className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/50">
          {SEARCH_PAGE_COPY.recentHeading}
        </h2>
        <button
          type="button"
          onClick={forgetAllSearches}
          className="text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/45 underline decoration-dotted underline-offset-2 transition hover:text-foreground/75"
        >
          {SEARCH_PAGE_COPY.recentClear}
        </button>
      </li>

      {history.slice(0, RECENT_SEARCH_VISIBLE).map((query) => (
        <li key={query} className="flex items-center gap-1 pr-2">
          <Link
            href={`/search?query=${encodeURIComponent(query)}`}
            className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left outline-none transition hover:bg-surface-muted/50 focus-visible:bg-surface-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40"
          >
            {/* The glyph lane, so a remembered search lines up with the results above it. */}
            <span className="flex w-20 shrink-0 justify-center text-foreground/35 sm:w-24">
              <HistoryIcon />
            </span>
            <span className="truncate text-sm font-bold text-foreground/80 sm:text-base">{query}</span>
          </Link>
          <button
            type="button"
            onClick={() => forgetSearch(query)}
            aria-label={`${SEARCH_PAGE_COPY.recentForget} ${query}`}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-foreground/35 transition hover:bg-surface-muted hover:text-foreground"
          >
            <svg viewBox="0 0 20 20" aria-hidden="true" className="h-3.5 w-3.5 fill-current">
              <path d="M5.28 3.86 10 8.59l4.72-4.73a1 1 0 0 1 1.42 1.42L11.41 10l4.73 4.72a1 1 0 0 1-1.42 1.42L10 11.41l-4.72 4.73a1 1 0 0 1-1.42-1.42L8.59 10 3.86 5.28a1 1 0 0 1 1.42-1.42Z" />
            </svg>
          </button>
        </li>
      ))}
    </>
  );

  return variant === "card" ? <ul className={SEARCH_LIST_CARD}>{rows}</ul> : rows;
}

function HistoryIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5 fill-current">
      <path d="M10 2a8 8 0 1 0 5.66 13.66 1 1 0 0 0-1.42-1.42A6 6 0 1 1 16 10a1 1 0 1 0 2 0 8 8 0 0 0-8-8Zm-.5 3.5a1 1 0 0 0-1 1V10a1 1 0 0 0 .45.83l2.5 1.67a1 1 0 1 0 1.1-1.66L10.5 9.46V6.5a1 1 0 0 0-1-1Z" />
    </svg>
  );
}
