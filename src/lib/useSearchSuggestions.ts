"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";

import type { SearchHit, SearchResults } from "./globalSearch";
import { SUGGEST_DEBOUNCE_MS, dedupeByGlyph, suggestUrl } from "./globalSearchSuggest";

export type SearchSuggestions = {
  /** One ranked row per glyph, capped for the dropdown. */
  hits: SearchHit[];
  /** Every hit the full results page would show, for the footer count. */
  totalHits: number;
  /** True only before the first answer, so the old list never flashes away. */
  searching: boolean;
};

/**
 * The suggestions a typed value earns, debounced and cached.
 *
 * SWR keys on the request URL, so retyping a prefix replays from memory and a
 * slow answer for an old key can never overwrite a newer one. Previous data is
 * kept while the next request runs - the list updates in place rather than
 * flickering empty between keystrokes.
 */
export function useSearchSuggestions(value: string): SearchSuggestions {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), SUGGEST_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [value]);

  const url = suggestUrl(debounced);
  const { data, isLoading } = useSWR<SearchResults>(
    url,
    async (requestUrl: string) => {
      const response = await fetch(requestUrl);
      const payload = (await response.json()) as SearchResults & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not search.");
      }
      return payload;
    },
    { keepPreviousData: true, revalidateOnFocus: false },
  );

  const hits = useMemo(() => dedupeByGlyph(data?.hits ?? []), [data]);

  return {
    hits,
    totalHits: data?.totalHits ?? 0,
    searching: Boolean(url) && isLoading && !data,
  };
}
