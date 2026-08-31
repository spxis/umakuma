import { getStoredJson, setStoredJson } from "./clientStorage";

/**
 * The searches this browser has run, most recent first.
 *
 * Kept on the device rather than the account: a search is a half-formed
 * thought, not something worth syncing, and storing it locally means an
 * anonymous visitor gets the same convenience as a member.
 *
 * More is remembered than is shown. Five rows is what fits under the results
 * without becoming a second list to read, but forgetting one should reveal the
 * sixth rather than leave a gap - which only works if the sixth was still
 * there. Twenty is deep enough that clearing a few never empties the panel.
 */
export const RECENT_SEARCH_KEY = "umakuma:recent-searches";
export const RECENT_SEARCH_MEMORY = 20;
export const RECENT_SEARCH_VISIBLE = 5;

/** Newest first, no duplicates, capped at what is remembered. */
export function addRecentSearch(list: string[], query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed) return list;
  const others = list.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
  return [trimmed, ...others].slice(0, RECENT_SEARCH_MEMORY);
}

export function removeRecentSearch(list: string[], query: string): string[] {
  return list.filter((item) => item !== query);
}

/**
 * What survives a round trip through storage.
 *
 * Anything can be in localStorage - an older shape, another tab's experiment,
 * hand-edited nonsense - so the list is filtered to strings rather than
 * trusted, and a broken value reads as no history instead of throwing on a
 * page the member came to for something else.
 */
export function readRecentSearches(): string[] {
  const stored = getStoredJson<unknown>(RECENT_SEARCH_KEY, []);
  if (!Array.isArray(stored)) return [];
  return stored
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .slice(0, RECENT_SEARCH_MEMORY);
}

export function writeRecentSearches(list: string[]): void {
  setStoredJson(RECENT_SEARCH_KEY, list.slice(0, RECENT_SEARCH_MEMORY));
}

/**
 * The history as an external store, which is what it actually is.
 *
 * `useSyncExternalStore` wants a snapshot that keeps its identity until the
 * data changes, so the parsed list is cached here and replaced only on a
 * write. Reading storage during render instead would differ from what the
 * server rendered; reading it into state from an effect would paint an empty
 * panel first and then fill it.
 */
const EMPTY: string[] = [];
let cached: string[] | null = null;
const listeners = new Set<() => void>();

export function subscribeRecentSearches(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function recentSearchesSnapshot(): string[] {
  if (cached === null) cached = readRecentSearches();
  return cached;
}

/** The server knows nothing about this browser, so it renders no history. */
export function recentSearchesServerSnapshot(): string[] {
  return EMPTY;
}

function publish(next: string[]): void {
  cached = next;
  writeRecentSearches(next);
  for (const listener of listeners) listener();
}

export function rememberSearch(query: string): void {
  const current = recentSearchesSnapshot();
  const next = addRecentSearch(current, query);
  if (next !== current) publish(next);
}

export function forgetSearch(query: string): void {
  publish(removeRecentSearch(recentSearchesSnapshot(), query));
}

export function forgetAllSearches(): void {
  publish(EMPTY);
}
