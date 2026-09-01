/**
 * One search across the three catalogues.
 *
 * Search was buried inside each explorer, filtering the list you were already
 * looking at. That answers "narrow this page" but not "where does 鉛筆 live",
 * which is the question a learner actually has. This is the shared vocabulary
 * for asking all three at once and getting one ranked answer back.
 */

import { SUBJECT_TYPES } from "./domainConstants";

export const SEARCH_SOURCES = {
  wanikani: "wanikani",
  jlpt: "jlpt",
  grades: "grades",
} as const;

export type SearchSource = (typeof SEARCH_SOURCES)[keyof typeof SEARCH_SOURCES];

export const SEARCH_SOURCE_VALUES = Object.values(SEARCH_SOURCES) as SearchSource[];

export function isSearchSource(value: string): value is SearchSource {
  return (SEARCH_SOURCE_VALUES as string[]).includes(value);
}

/** Display names, one place, for the locale layer to swap. */
export const SEARCH_SOURCE_LABELS: Record<SearchSource, string> = {
  [SEARCH_SOURCES.wanikani]: "WaniKani",
  [SEARCH_SOURCES.jlpt]: "JLPT",
  [SEARCH_SOURCES.grades]: "School Grades",
};

export type SearchHit = {
  source: SearchSource;
  /** Unique within a result set; source plus its own identifier. */
  key: string;
  glyph: string;
  /**
   * The subject type driving the glyph's colour. JLPT and school-grade entries
   * are always single kanji; only WaniKani has radicals and vocabulary.
   */
  subjectType: string;
  /** The English meaning, the line a reader scans. */
  meaning: string;
  /** Readings, already joined for display, or null when the source has none. */
  reading: string | null;
  /** Short pills: the subject type, a level, an N number, a grade. */
  badges: string[];
  /** School grade, so a grade hit can link to the right grade page. */
  grade?: number;
  /** Where selecting the hit goes, filled in once the viewer is known. */
  href: string | null;
  /** Higher sorts first; see `rankHit`. */
  score: number;
};

/** What `/api/search` returns; shared so client callers can type the payload. */
export type SearchResults = {
  query: string;
  totalHits: number;
  countsBySource: Record<SearchSource, number>;
  hits: SearchHit[];
};

export const SEARCH_MIN_QUERY_LENGTH = 1;
export const SEARCH_PER_SOURCE_LIMIT = 24;

/** How many results the page shows before it fetches the next stretch. */
export const SEARCH_PAGE_SIZE = 20;

/**
 * The widest window a single request may ask for.
 *
 * Ranking happens over what the three catalogues returned, so no window can
 * reach past that anyway; the cap is here to keep a hand-written query string
 * from asking for a megabyte of JSON.
 */
export const SEARCH_MAX_WINDOW = SEARCH_PER_SOURCE_LIMIT * 8;

/** The search page itself, with nothing asked of it yet. */
export const SEARCH_PAGE_HREF = "/search";

/**
 * Where the magnifier, or Enter, goes.
 *
 * An empty box used to do nothing at all: the member clicked search, search
 * refused, and there was no way to reach the search page from the header
 * without typing something first. Empty now means "take me to search", which
 * is what pressing a search button with nothing to search plainly asks for.
 */
export function searchSubmitHref(query: string, resultsHref: (query: string) => string): string {
  const trimmed = query.trim();
  return trimmed ? resultsHref(trimmed) : SEARCH_PAGE_HREF;
}

/**
 * A request for one window of results.
 *
 * `limit` left out means "everything ranked", which is what the results page
 * asked for before it paged and what any caller wanting counts still wants.
 */
export function searchRequestUrl(
  query: string,
  options: { limit?: number; offset?: number; sources?: SearchSource[] } = {},
): string {
  const parts = [`q=${encodeURIComponent(query)}`];
  if (options.sources?.length) parts.push(`sources=${options.sources.join(",")}`);
  if (options.limit !== undefined) parts.push(`limit=${options.limit}`);
  if (options.offset) parts.push(`offset=${options.offset}`);
  return `/api/search?${parts.join("&")}`;
}

/**
 * The next stretch of results added to what is already on screen.
 *
 * A window is asked for by offset, and a slow answer can arrive after the
 * reader has already loaded past it, so an incoming row that is already listed
 * is dropped rather than rendered twice under the same key.
 */
export function appendHits(existing: SearchHit[], incoming: SearchHit[]): SearchHit[] {
  const seen = new Set(existing.map((hit) => hit.key));
  return [...existing, ...incoming.filter((hit) => !seen.has(hit.key))];
}

/** Trims and collapses whitespace; an empty result means "do not search". */
export function normalizeQuery(raw: string | null | undefined): string {
  return String(raw ?? "").trim().replace(/\s+/g, " ").slice(0, 64);
}

export function isSearchable(query: string): boolean {
  return query.length >= SEARCH_MIN_QUERY_LENGTH;
}

/**
 * Whether the query is Japanese script rather than Latin.
 *
 * It changes what a match means: 「日」 should match a character, while "sun"
 * should match a meaning, and scoring the two the same way buries the exact
 * character hit under every vocabulary word that mentions it.
 */
export function isJapaneseQuery(query: string): boolean {
  return /[぀-ヿ㐀-䶿一-鿿]/.test(query);
}

/** The sources a request asked for; all three when it named none or all. */
export function parseSources(raw: string | null | undefined): SearchSource[] {
  const requested = String(raw ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(isSearchSource);

  return requested.length > 0 ? Array.from(new Set(requested)) : [...SEARCH_SOURCE_VALUES];
}

/**
 * How well a hit answers the query.
 *
 * An exact character or an exact meaning is what the searcher almost always
 * meant, so those outrank a substring; a meaning that merely contains the word
 * ranks by how much of the field the word covers, which keeps "sun" ahead of
 * "sunflower seed merchant". Ties fall back to the shorter glyph, since single
 * kanji are more often the target than long compounds.
 */
export function rankHit(query: string, glyph: string, meaning: string, reading: string | null): number {
  const needle = query.toLowerCase();
  const glyphText = glyph.toLowerCase();
  const meaningText = meaning.toLowerCase();
  const readingText = (reading ?? "").toLowerCase();

  if (glyphText === needle) return 1000;
  if (meaningText === needle) return 900;
  if (readingText.split(/[、,\s]+/).includes(needle)) return 800;

  let score = 0;
  if (glyphText.includes(needle)) score = 600;
  else if (meaningText.startsWith(needle)) score = 500;
  else if (meaningText.includes(needle)) score = 400;
  else if (readingText.includes(needle)) score = 300;

  if (score === 0) return 0;

  const coverage = meaningText.length > 0 ? needle.length / meaningText.length : 0;
  return score + Math.round(coverage * 50) - Math.min(glyph.length, 9);
}

/**
 * The best score any spelling of the query earns.
 *
 * Romaji folding means one query arrives as several strings - "watashi",
 * わたし, ワタシ - and a hit is as good as its best match. Taking the maximum
 * keeps folding from ever demoting a result the raw text already earned.
 */
export function rankHitForVariants(
  variants: string[],
  glyph: string,
  meaning: string,
  reading: string | null,
): number {
  let best = 0;
  for (const variant of variants) {
    const score = rankHit(variant, glyph, meaning, reading);
    if (score > best) best = score;
  }
  return best;
}

/** The best a hit scores, and which of its meanings earned that. */
export type MeaningRank = { score: number; meaning: string };

/**
 * The best score across every meaning a subject carries, not just its first.
 *
 * All three catalogues search every meaning they hold and then used to rank
 * the hit on its primary alone, so a subject matched on any other meaning
 * scored zero and was dropped by the filter that removes non-matches: the
 * search found it and then threw it away. "magnate" is one of 王's meanings
 * and returned nothing at all, because 王 leads with "King".
 */
export function rankMeanings(
  variants: string[],
  glyph: string,
  meanings: string[],
  reading: string | null,
): MeaningRank {
  let best: MeaningRank = { score: 0, meaning: meanings[0] ?? "" };
  for (const meaning of meanings) {
    const score = rankHitForVariants(variants, glyph, meaning, reading);
    if (score > best.score) best = { score, meaning };
  }
  return best;
}

/**
 * What the row says, when the query matched something the row does not lead
 * with. A result for "magnate" reading only "King" looks like a mistake, so
 * the meaning that earned the match rides along behind the primary one.
 */
export function displayMeaning(primary: string, matched: string): string {
  const lead = primary.trim();
  const also = matched.trim();
  if (!also || also.toLowerCase() === lead.toLowerCase()) return lead;
  if (!lead) return also;
  return `${lead} · ${also}`;
}

/** Ranked best first, with a stable order for equal scores. */
export function sortHits(hits: SearchHit[]): SearchHit[] {
  return [...hits].sort((left, right) => {
    if (left.score !== right.score) return right.score - left.score;
    if (left.glyph.length !== right.glyph.length) return left.glyph.length - right.glyph.length;
    return left.key.localeCompare(right.key);
  });
}

/**
 * The public page for a hit, for a reader with no account.
 *
 * `/kanji/[character]` is deliberately public - it is the page a shared kanji
 * link opens - and it takes a single character, so a word or a radical drawn
 * as an image has nowhere of its own to go.
 */
export function publicKanjiHref(hit: SearchHit): string | null {
  const characters = [...hit.glyph];
  if (characters.length !== 1 || hit.subjectType !== SUBJECT_TYPES.kanji) {
    return null;
  }
  return `/kanji/${encodeURIComponent(hit.glyph)}`;
}

/**
 * Where a hit leads.
 *
 * A signed-in member goes to their own explorer, which carries their SRS
 * state and already accepts a find parameter, so the hit arrives with its
 * search applied. Those pages are behind the sign-in wall, so a reader with no
 * account used to get no link at all - every row was dead text, on the page
 * most likely to be reached by someone who has never signed in. A single kanji
 * has a public page, so that is where they go instead.
 */
export function searchHitHref(hit: SearchHit, username: string | null): string | null {
  if (!username) {
    return publicKanjiHref(hit);
  }

  const base = `/users/${encodeURIComponent(username)}`;
  const glyph = encodeURIComponent(hit.glyph);

  if (hit.source === SEARCH_SOURCES.jlpt) {
    return `${base}/jlpt-explorer?findJlpt=${glyph}`;
  }

  if (hit.source === SEARCH_SOURCES.grades) {
    const grade = typeof hit.grade === "number" ? hit.grade : 1;
    return `${base}/grades?grade=${grade}&q=${glyph}`;
  }

  return `${base}/library-explorer?findLevel=${glyph}`;
}
