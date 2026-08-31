import {
  isJapaneseQuery,
  normalizeQuery,
  searchHitHref,
  type SearchHit,
} from "./globalSearch";

/**
 * The header search's suggestion logic, kept pure so it tests without a DOM.
 *
 * Suggestions reuse `/api/search` rather than a dedicated endpoint: the route
 * is already rate-limited and CDN-cached per query string, and prefixes are
 * shared across everyone typing, so most keystrokes never reach the database.
 */

export const SUGGEST_LIMIT = 10;
export const SUGGEST_DEBOUNCE_MS = 200;

/**
 * One character of Japanese is a real query (日), but one Latin letter matches
 * half the catalogue's meanings, so Latin waits for a second keystroke.
 */
export function suggestMinLength(query: string): number {
  return isJapaneseQuery(query) ? 1 : 2;
}

export function isSuggestable(raw: string): boolean {
  const query = normalizeQuery(raw);
  return query.length >= suggestMinLength(query);
}

/** The request a value warrants, or null when it is too short to ask about. */
export function suggestUrl(raw: string): string | null {
  const query = normalizeQuery(raw);
  return isSuggestable(query) ? `/api/search?q=${encodeURIComponent(query)}` : null;
}

/**
 * One row per glyph, best hit first.
 *
 * A common character sits in all three catalogues, and the results page rightly
 * shows every copy - but a ten-row dropdown cannot spend three rows on 日. The
 * hits arrive ranked, so keeping the first appearance keeps the best one.
 */
export function dedupeByGlyph(hits: SearchHit[], limit: number = SUGGEST_LIMIT): SearchHit[] {
  const kept: SearchHit[] = [];
  const seen = new Set<string>();
  for (const hit of hits) {
    if (seen.has(hit.glyph)) continue;
    seen.add(hit.glyph);
    kept.push(hit);
    if (kept.length >= limit) break;
  }
  return kept;
}

/**
 * Where picking a suggestion goes. A signed-in member lands in their own
 * explorer with the find already applied; an anonymous visitor gets the results
 * page for that exact glyph, since the explorer links would bounce off the
 * sign-in wall.
 */
export function suggestionHref(hit: SearchHit, viewerUsername: string | null): string {
  return searchHitHref(hit, viewerUsername) ?? `/search?query=${encodeURIComponent(hit.glyph)}`;
}
