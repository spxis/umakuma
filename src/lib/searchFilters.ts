import { SEARCH_SOURCE_VALUES, isSearchSource, type SearchSource } from "./globalSearch";
import { SEARCH_KIND_VALUES, isSearchKind, type SearchKind } from "./searchKinds";

/**
 * Which columns and which kinds of row the results are showing.
 *
 * Two axes, because the results have two. A row comes from a catalogue and it
 * is a word, a kanji or a radical, and neither answers the other's question:
 * the catalogue decides which column a row sits in, and the kind decides
 * whether it is worth reading at all. Both are worth turning off - a member
 * with no interest in radicals wants them gone from every column at once.
 *
 * Everything is on until something is turned off, and the address carries only
 * what is kept. That way a plain search is a plain address, a filtered one can
 * be sent to somebody, and the back button walks the filters like any other
 * navigation instead of leaving them stuck to the browser.
 */

export const SEARCH_FILTER_PARAMS = { kinds: "kinds", sources: "from" } as const;

export type SearchFilters = {
  /** The kinds kept; empty means every kind. */
  kinds: SearchKind[];
  /** The sources kept; empty means every source. */
  sources: SearchSource[];
};

export const NO_FILTERS: SearchFilters = { kinds: [], sources: [] };

function parseList<T extends string>(raw: string | null | undefined, keep: (value: string) => value is T, all: T[]): T[] {
  const asked = String(raw ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(keep);

  const unique = Array.from(new Set(asked));
  /*
   * Naming all of them is the same as naming none, and is written as none, so
   * one state has one address rather than two that look different and behave
   * alike.
   */
  return unique.length === 0 || unique.length === all.length ? [] : unique;
}

export function parseSearchFilters(params: URLSearchParams): SearchFilters {
  return {
    kinds: parseList(params.get(SEARCH_FILTER_PARAMS.kinds), isSearchKind, SEARCH_KIND_VALUES),
    sources: parseList(params.get(SEARCH_FILTER_PARAMS.sources), isSearchSource, SEARCH_SOURCE_VALUES),
  };
}

/** Whether a value is showing: everything shows until something is turned off. */
export function isKept<T extends string>(kept: T[], value: T): boolean {
  return kept.length === 0 || kept.includes(value);
}

/**
 * The set after one chip is clicked.
 *
 * Turning the last one off would leave a page with nothing on it and no way to
 * tell that from a search that found nothing, so it turns everything back on
 * instead - the same thing the All chip does, reached by the same click that
 * would otherwise empty the page.
 */
export function toggleValue<T extends string>(kept: T[], all: T[], value: T): T[] {
  const current = kept.length === 0 ? all : kept;
  const next = current.includes(value)
    ? current.filter((held) => held !== value)
    : [...current, value];

  if (next.length === 0 || next.length === all.length) return [];
  /* Kept in the canonical order, so two routes to one state give one address. */
  return all.filter((held) => next.includes(held));
}

/** The filters written back into an address, leaving out what is not filtered. */
export function writeSearchFilters(params: URLSearchParams, filters: SearchFilters): void {
  if (filters.kinds.length > 0) params.set(SEARCH_FILTER_PARAMS.kinds, filters.kinds.join(","));
  else params.delete(SEARCH_FILTER_PARAMS.kinds);

  if (filters.sources.length > 0) params.set(SEARCH_FILTER_PARAMS.sources, filters.sources.join(","));
  else params.delete(SEARCH_FILTER_PARAMS.sources);
}

/** The address for a search under these filters. */
export function searchResultsHref(query: string, filters: SearchFilters): string {
  const params = new URLSearchParams({ query });
  writeSearchFilters(params, filters);
  return `/search?${params.toString()}`;
}

/** The address that flips one kind chip. */
export function toggleKindHref(query: string, filters: SearchFilters, kind: SearchKind): string {
  return searchResultsHref(query, {
    ...filters,
    kinds: toggleValue(filters.kinds, SEARCH_KIND_VALUES, kind),
  });
}

/** The address that flips one source chip. */
export function toggleSourceHref(query: string, filters: SearchFilters, source: SearchSource): string {
  return searchResultsHref(query, {
    ...filters,
    sources: toggleValue(filters.sources, SEARCH_SOURCE_VALUES, source),
  });
}

/** The address that shows one source on its own, for a column's "more" link. */
export function onlySourceHref(query: string, filters: SearchFilters, source: SearchSource): string {
  return searchResultsHref(query, { ...filters, sources: [source] });
}

export function hasAnyFilter(filters: SearchFilters): boolean {
  return filters.kinds.length > 0 || filters.sources.length > 0;
}
