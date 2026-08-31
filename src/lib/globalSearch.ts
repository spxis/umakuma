/**
 * One search across the three catalogues.
 *
 * Search was buried inside each explorer, filtering the list you were already
 * looking at. That answers "narrow this page" but not "where does 鉛筆 live",
 * which is the question a learner actually has. This is the shared vocabulary
 * for asking all three at once and getting one ranked answer back.
 */

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

/** Ranked best first, with a stable order for equal scores. */
export function sortHits(hits: SearchHit[]): SearchHit[] {
  return [...hits].sort((left, right) => {
    if (left.score !== right.score) return right.score - left.score;
    if (left.glyph.length !== right.glyph.length) return left.glyph.length - right.glyph.length;
    return left.key.localeCompare(right.key);
  });
}

/**
 * Where a hit leads, or null when nobody is signed in.
 *
 * Every destination is one of the viewer's own explorer pages, so an anonymous
 * search stays a lookup rather than offering links that would bounce off the
 * sign-in wall. Each explorer already accepts a find parameter, so the hit
 * arrives with its search already applied.
 */
export function searchHitHref(hit: SearchHit, username: string | null): string | null {
  if (!username) {
    return null;
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
