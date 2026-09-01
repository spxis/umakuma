import { SUBJECT_TYPES } from "./domainConstants";
import { getStoredJson, setStoredJson } from "./clientStorage";
import { searchHitHref, type SearchHit } from "./globalSearch";

/**
 * What this browser has looked up, most recent first.
 *
 * It used to hold only the words that were typed into the box, which is half
 * of what looking something up is: you search "water", read down forty rows,
 * open 水兵, and the one thing you would want to get back to - 水兵 - was the
 * one thing not remembered. The history recorded the question and threw away
 * the answer.
 *
 * So an entry is either a search that was run or a subject that was opened,
 * and both are kept the same way: an address, something to draw, and enough
 * around it to recognise which one it was. Anything that opens a subject adds
 * to it, so the list grows as the browser is used rather than only when the
 * search page is visited.
 *
 * Kept on the device rather than the account: a lookup is a half-formed
 * thought, not something worth syncing, and storing it locally means an
 * anonymous visitor gets the same convenience as a member.
 */

export const RECENT_ITEMS_KEY = "umakuma:recent-items";

/**
 * More is remembered than is shown, so forgetting one reveals the next rather
 * than leaving a gap - which only works if the next one was still there.
 */
export const RECENT_ITEMS_MEMORY = 40;
export const RECENT_ITEMS_VISIBLE = 8;

export type RecentItem = {
  /** Where it goes, and what identifies it: two rows never share an address. */
  href: string;
  /** The glyph for a subject, the words typed for a search. */
  label: string;
  /** The English, for a subject that has one. */
  meaning: string | null;
  /**
   * The subject type, for the glyph's colour, or null for a search. It is also
   * what tells the two apart in the list.
   */
  subjectType: string | null;
};

/** A search that was run, which is a lookup like any other. */
export function recentQuery(query: string): RecentItem | null {
  const trimmed = query.trim();
  if (!trimmed) return null;
  return {
    href: `/search?query=${encodeURIComponent(trimmed)}`,
    label: trimmed,
    meaning: null,
    subjectType: null,
  };
}

/**
 * A subject that was opened.
 *
 * Identified by where it goes rather than by what it says, because those are
 * not the same question: 水 the kanji and 水 the word are one character and
 * two pages, and remembering them under the character would have kept whichever
 * was opened second and quietly dropped the other.
 */
export function recentHit(hit: SearchHit): RecentItem | null {
  const href = searchHitHref(hit);
  if (!href) return null;
  return {
    href,
    label: hit.glyph,
    meaning: hit.meaning?.trim() || null,
    subjectType: hit.subjectType,
  };
}

/** Whether the row is a subject rather than a search that was run. */
export function isSubjectItem(item: RecentItem): boolean {
  return item.subjectType !== null;
}

/** Newest first, no duplicates, capped at what is remembered. */
export function addRecentItem(list: RecentItem[], item: RecentItem | null): RecentItem[] {
  if (!item) return list;
  const others = list.filter((held) => held.href !== item.href);
  return [item, ...others].slice(0, RECENT_ITEMS_MEMORY);
}

export function removeRecentItem(list: RecentItem[], href: string): RecentItem[] {
  return list.filter((held) => held.href !== href);
}

/**
 * What survives a round trip through storage.
 *
 * Anything can be in localStorage - an older shape, another tab's experiment,
 * hand-edited nonsense - so rows are checked rather than trusted, and a broken
 * value reads as no history instead of throwing on a page the member came to
 * for something else.
 */
function parseItem(value: unknown): RecentItem | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<RecentItem>;
  if (typeof row.href !== "string" || !row.href.trim()) return null;
  if (typeof row.label !== "string" || !row.label.trim()) return null;

  return {
    href: row.href,
    label: row.label,
    meaning: typeof row.meaning === "string" && row.meaning.trim() ? row.meaning : null,
    subjectType:
      typeof row.subjectType === "string" && isKnownSubjectType(row.subjectType)
        ? row.subjectType
        : null,
  };
}

function isKnownSubjectType(value: string): boolean {
  return (Object.values(SUBJECT_TYPES) as string[]).includes(value);
}

export function readRecentItems(): RecentItem[] {
  const stored = getStoredJson<unknown>(RECENT_ITEMS_KEY, []);
  if (!Array.isArray(stored)) return [];

  const kept: RecentItem[] = [];
  const seen = new Set<string>();
  for (const value of stored) {
    const item = parseItem(value);
    if (!item || seen.has(item.href)) continue;
    seen.add(item.href);
    kept.push(item);
    if (kept.length >= RECENT_ITEMS_MEMORY) break;
  }
  return kept;
}

export function writeRecentItems(list: RecentItem[]): void {
  setStoredJson(RECENT_ITEMS_KEY, list.slice(0, RECENT_ITEMS_MEMORY));
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
const EMPTY: RecentItem[] = [];
let cached: RecentItem[] | null = null;
const listeners = new Set<() => void>();

export function subscribeRecentItems(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function recentItemsSnapshot(): RecentItem[] {
  if (cached === null) cached = readRecentItems();
  return cached;
}

/** The server knows nothing about this browser, so it renders no history. */
export function recentItemsServerSnapshot(): RecentItem[] {
  return EMPTY;
}

function publish(next: RecentItem[]): void {
  cached = next;
  writeRecentItems(next);
  for (const listener of listeners) listener();
}

/** Remember a search that was run. */
export function rememberSearch(query: string): void {
  remember(recentQuery(query));
}

/** Remember a subject that was opened, from wherever it was opened. */
export function rememberHit(hit: SearchHit): void {
  remember(recentHit(hit));
}

export function remember(item: RecentItem | null): void {
  if (!item) return;
  const current = recentItemsSnapshot();
  const next = addRecentItem(current, item);
  if (next !== current) publish(next);
}

export function forgetItem(href: string): void {
  publish(removeRecentItem(recentItemsSnapshot(), href));
}

export function forgetAllItems(): void {
  publish(EMPTY);
}

/** For tests: drops the cached snapshot so the next read parses storage again. */
export function resetRecentItemsCache(): void {
  cached = null;
}
