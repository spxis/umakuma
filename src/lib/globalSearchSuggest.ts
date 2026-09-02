import {
  SEARCH_SOURCE_VALUES,
  isJapaneseQuery,
  normalizeQuery,
  searchHitHref,
  searchRequestUrl,
  type SearchHit,
} from "./globalSearch";
import { kindForHit } from "./searchKinds";

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
 * How far the dropdown may grow, and how early it asks for the next stretch.
 *
 * The list starts at ten because that is what fits without becoming a page of
 * its own, and grows a page at a time as someone arrows or scrolls toward the
 * end - the way a phone list loads the next screenful rather than making you
 * ask. Past forty rows the answer is the results page, not more dropdown.
 */
export const SUGGEST_MAX_PAGES = 4;
export const SUGGEST_LOAD_LEAD = 3;

/** Rows on screen after `pages` of growth; page 2 is a superset of page 1. */
export function suggestRows(pages: number): number {
  return SUGGEST_LIMIT * Math.min(Math.max(pages, 1), SUGGEST_MAX_PAGES);
}

/**
 * The most hits one row can collapse before the dropdown shows it.
 *
 * Three, not four: the same kanji appears at most once per teaching catalogue,
 * and the dictionary answers only where none of them do, so a character is
 * either in the catalogues - up to three copies - or in the dictionary alone.
 */
const COPIES_PER_ROW = SEARCH_SOURCE_VALUES.length - 1;

/**
 * The raw hits to ask for to be sure of filling that many rows.
 *
 * The dropdown keeps one row per subject while the catalogues each hold their
 * own copy of it, so ten raw hits can collapse into four rows. Asking for
 * three per row is the exact worst case rather than a guess.
 */
export function suggestRawWindow(rows: number): number {
  return rows * COPIES_PER_ROW;
}

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

/**
 * The request a value warrants, or null when it is too short to ask about.
 *
 * The window grows rather than stepping - ten rows, then twenty, from offset
 * zero every time. Paging by offset would be fewer bytes, but the dropdown
 * keeps one row per subject and a duplicate can straddle any boundary, so a
 * superset is the only window that cannot reorder rows under the highlight.
 * The database does the same work either way; only the JSON is bigger.
 */
export function suggestUrl(raw: string, rows: number = SUGGEST_LIMIT): string | null {
  const query = normalizeQuery(raw);
  return isSuggestable(query) ? searchRequestUrl(query, { limit: suggestRawWindow(rows) }) : null;
}

/**
 * One row per subject, best hit first.
 *
 * A common character sits in all three catalogues, and the results page rightly
 * shows every copy - but a ten-row dropdown cannot spend three rows on 日. The
 * hits arrive ranked, so keeping the first appearance keeps the best one.
 *
 * Deduping on the glyph alone was wrong, and it hid the answer: 朝 is both a
 * kanji and a word written the same way, so searching "Morning" collapsed all
 * four rows - the word and the kanji from each of the three catalogues - into
 * the word, and the dropdown offered the word and the radical 𠦝 but never the
 * character the query names. Which of the two led was decided by nothing more
 * than 3044 sorting before 695 as text. That is true of most single-character
 * words: 水, 山, 人, 川 all lost their kanji the same way.
 *
 * So the row is a subject, not a spelling. The same kanji from three
 * catalogues is still one row - that is the duplication the dropdown cannot
 * afford - while a kanji and a word that share a spelling are two, because
 * they are two different things with two different pages behind them.
 */
export function dedupeByGlyphAndKind(hits: SearchHit[], limit: number = SUGGEST_LIMIT): SearchHit[] {
  const kept: SearchHit[] = [];
  const seen = new Set<string>();
  for (const hit of hits) {
    const row = `${kindForHit(hit)}:${hit.glyph}`;
    if (seen.has(row)) continue;
    seen.add(row);
    kept.push(hit);
    if (kept.length >= limit) break;
  }
  return kept;
}

/**
 * Where picking a suggestion goes: the same page selecting the result would
 * open, since the dropdown and the results list are two views of one answer.
 * The full results stand in for the handful of rows that have no page of their
 * own - a radical the catalogue could not name.
 */
export function suggestionHref(hit: SearchHit): string {
  return searchHitHref(hit) ?? `/search?query=${encodeURIComponent(hit.glyph)}`;
}

/** How far down the ranking a completion may come from. */
export const GHOST_SCAN_DEPTH = 5;

/**
 * The rest of a top hit's field that extends what was typed, or null.
 *
 * This is the faint-grey completion after the caret. It only ever extends a
 * prefix - "ani" ghosts "mal" from Animal, にほ ghosts ん from にほん - and
 * offers nothing when a hit merely relates, because completing "animal" with
 * 獣 would replace the member's words rather than finish them.
 *
 * It reads a few rows rather than only the first, because the best answer and
 * the best completion are different questions: "ani" ranks 兄 first on its あに
 * reading, and stopping there would offer no completion at all while "animal"
 * sat one row below. The first row that can finish the word wins.
 */
export function ghostFor(typed: string, hits: SearchHit[]): string | null {
  if (typed.length === 0) return null;
  const needle = typed.toLowerCase();
  for (const hit of hits.slice(0, GHOST_SCAN_DEPTH)) {
    const fields = [hit.meaning, ...(hit.reading ?? "").split("、"), hit.glyph];
    for (const field of fields) {
      const candidate = field.trim();
      if (candidate.length > typed.length && candidate.toLowerCase().startsWith(needle)) {
        return candidate.slice(typed.length);
      }
    }
  }
  return null;
}
