"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";

import type { SearchApiResponse, SearchHit } from "./globalSearch";
import type { SearchAnswer } from "./searchAnswers";
import { SUGGEST_DEBOUNCE_MS, SUGGEST_LIMIT, dedupeByGlyphAndKind, suggestUrl } from "./globalSearchSuggest";

export type SearchSuggestions = {
  /** One ranked row per subject, capped for the dropdown. */
  hits: SearchHit[];
  /** What the query worked out rather than found: a year, an amount. */
  answers: SearchAnswer[];
  /** Every hit the full results page would show, for the footer count. */
  totalHits: number;
  /** True only before the first answer, so the old list never flashes away. */
  searching: boolean;
  /** Whether growing the window would bring more rows. */
  hasMore: boolean;
  /** True while a wider window is on its way, with the old rows still shown. */
  loadingMore: boolean;
};

/**
 * The suggestions a typed value earns, debounced and cached.
 *
 * SWR keys on the request URL, so retyping a prefix replays from memory and a
 * slow answer for an old key can never overwrite a newer one. Previous data is
 * kept while the next request runs - the list updates in place rather than
 * flickering empty between keystrokes.
 */
export function useSearchSuggestions(value: string, rows: number = SUGGEST_LIMIT): SearchSuggestions {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), SUGGEST_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [value]);

  /*
   * A wider window is a different key, so the rows already on screen stay put
   * (keepPreviousData) while the longer list is fetched, and arrowing back to
   * a narrower window replays from cache instead of asking again.
   */
  const url = suggestUrl(debounced, rows);
  const { data, isLoading, isValidating } = useSWR<SearchApiResponse>(
    url,
    async (requestUrl: string) => {
      const response = await fetch(requestUrl);
      const payload = (await response.json()) as SearchApiResponse & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not search.");
      }
      return payload;
    },
    { keepPreviousData: true, revalidateOnFocus: false },
  );

  const hits = useMemo(() => dedupeByGlyphAndKind(data?.hits ?? [], rows), [data, rows]);

  return {
    hits,
    answers: data?.answers ?? [],
    totalHits: data?.totalHits ?? 0,
    searching: Boolean(url) && isLoading && !data,
    /*
     * A full list with more behind it. Short of the window means the answer
     * ran out, whatever the total says: the total counts every copy of a
     * subject, and these rows are one per subject.
     */
    hasMore: hits.length >= rows && (data?.totalHits ?? 0) > hits.length,
    loadingMore: Boolean(url) && isValidating && Boolean(data),
  };
}
