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

/**
 * The searches this browser has run, under the results.
 *
 * Looking a kanji up is rarely a single act - you check 家, then 家事, then go
 * back to 家 - and retyping it each time is the whole friction. The list is
 * read from storage after mount rather than during render, because the server
 * has no idea what this browser remembers and rendering a guess would flash
 * the wrong thing before correcting itself.
 */
export default function RecentSearches({ currentQuery }: { currentQuery: string }) {
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

  return (
    <section className="rounded-2xl border border-line bg-surface-muted p-4">
      <header className="flex items-center justify-between gap-3">
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
      </header>

      <ul className="mt-3 flex flex-wrap gap-2">
        {history.slice(0, RECENT_SEARCH_VISIBLE).map((query) => (
          <li
            key={query}
            className="flex items-center gap-1 rounded-full border border-line bg-surface pl-3 pr-1 transition hover:bg-surface-muted"
          >
            <Link
              href={`/search?query=${encodeURIComponent(query)}`}
              className="py-1.5 text-xs font-bold text-foreground/80"
            >
              {query}
            </Link>
            <button
              type="button"
              onClick={() => forgetSearch(query)}
              aria-label={`${SEARCH_PAGE_COPY.recentForget} ${query}`}
              className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-foreground/40 transition hover:bg-surface-muted hover:text-foreground"
            >
              <svg viewBox="0 0 20 20" aria-hidden="true" className="h-3 w-3 fill-current">
                <path d="M5.28 3.86 10 8.59l4.72-4.73a1 1 0 0 1 1.42 1.42L11.41 10l4.73 4.72a1 1 0 0 1-1.42 1.42L10 11.41l-4.72 4.73a1 1 0 0 1-1.42-1.42L8.59 10 3.86 5.28a1 1 0 0 1 1.42-1.42Z" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
