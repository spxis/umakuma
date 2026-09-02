/**
 * One search across the three catalogues.
 *
 * Search was buried inside each explorer, filtering the list you were already
 * looking at. That answers "narrow this page" but not "where does 鉛筆 live",
 * which is the question a learner actually has. This is the shared vocabulary
 * for asking all three at once and getting one ranked answer back.
 */

import { SUBJECT_TYPES } from "./domainConstants";
import type { KindCounts, SearchKind } from "./searchKinds";

export const SEARCH_SOURCES = {
  wanikani: "wanikani",
  jlpt: "jlpt",
  grades: "grades",
  dictionary: "dictionary",
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
  [SEARCH_SOURCES.dictionary]: "Dictionary",
};

/**
 * Which source wins when two hold the same character at the same score.
 *
 * The catalogues carry a member's review state and link into their explorers;
 * the dictionary is the reference behind them and links to a public page. So a
 * tie goes to the catalogue, and the dictionary row never displaces a hit that
 * could have opened someone's own study data.
 */
export const SEARCH_SOURCE_ORDER: Record<SearchSource, number> = {
  [SEARCH_SOURCES.wanikani]: 0,
  [SEARCH_SOURCES.jlpt]: 1,
  [SEARCH_SOURCES.grades]: 2,
  [SEARCH_SOURCES.dictionary]: 3,
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
  /**
   * WaniKani's permanent name for the subject, and null for the other sources.
   *
   * Radicals are why this is here: WaniKani draws roughly a fifth of them
   * rather than writing them, so those rows carry no character at all and the
   * slug is the only name they have to be addressed by.
   */
  slug: string | null;
  /** The English meaning, the line a reader scans. */
  meaning: string;
  /** Readings, already joined for display, or null when the source has none. */
  reading: string | null;
  /** Short pills: the subject type, a level, an N number, a grade. */
  badges: string[];
  /** School grade, so a grade hit can link to the right grade page. */
  grade?: number;
  /**
   * WaniKani's id for the subject, where the catalogue names it. The tags a
   * member keeps - trouble, favourite - hang off this id, so a row without
   * one can go on a saved list but cannot be tagged.
   */
  subjectId?: number;
  /** Where selecting the hit goes, filled in once the viewer is known. */
  href: string | null;
  /** Higher sorts first; see `rankHit`. */
  score: number;
};

/** What `/api/search` returns; shared so client callers can type the payload. */
export type SearchResults = {
  query: string;
  /** How many the whole answer holds, after any kind filter. */
  totalHits: number;
  countsBySource: Record<SearchSource, number>;
  /**
   * How many words, kanji and radicals the search found, before any kind
   * filter. The tabs need the count for the kinds you are not looking at.
   */
  countsByKind: KindCounts;
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
  options: { limit?: number; offset?: number; sources?: SearchSource[]; kind?: SearchKind | null } = {},
): string {
  const parts = [`q=${encodeURIComponent(query)}`];
  if (options.sources?.length) parts.push(`sources=${options.sources.join(",")}`);
  if (options.kind) parts.push(`kind=${options.kind}`);
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
    /* Alphabetical keys would put "dictionary:..." ahead of every catalogue. */
    const bySource = SEARCH_SOURCE_ORDER[left.source] - SEARCH_SOURCE_ORDER[right.source];
    if (bySource !== 0) return bySource;
    return left.key.localeCompare(right.key);
  });
}

/**
 * The public page for a single kanji.
 *
 * `/kanji/[character]` takes one character and answers for any of them: the
 * dictionary covers ten thousand, so this never depends on which catalogue
 * the reader came from, or on their level, or on their being signed in.
 */
export function publicKanjiHref(hit: SearchHit): string | null {
  const characters = [...hit.glyph];
  if (characters.length !== 1 || hit.subjectType !== SUBJECT_TYPES.kanji) {
    return null;
  }
  return `/kanji/${encodeURIComponent(hit.glyph)}`;
}

/**
 * Where any subject lives, from the three things that identify one.
 *
 * The one place that decides. Search results ask it, and so does every
 * cross-reference on a subject page - the radicals a kanji is built from, the
 * words that use it - and those two must agree, or following a link from a
 * result and following the same subject from a page would land differently.
 */
export function subjectHref(subject: {
  subjectType: string;
  /** What it is written with, absent for a radical WaniKani draws. */
  characters: string | null;
  /** WaniKani's permanent name for it. */
  slug: string | null;
}): string | null {
  if (subject.subjectType === SUBJECT_TYPES.radical) {
    return radicalHref(subject.slug);
  }

  if (subject.subjectType === SUBJECT_TYPES.vocabulary) {
    /* The slug is the word for all but a handful WaniKani had to distinguish. */
    return vocabularyHref(subject.slug ?? subject.characters ?? "");
  }

  const characters = [...(subject.characters ?? "")];
  return characters.length === 1 ? `/kanji/${encodeURIComponent(characters[0]!)}` : null;
}

/** The public page for one word. Addressed by the word, as Jisho does it. */
export function vocabularyHref(word: string): string | null {
  const trimmed = word.trim();
  return trimmed ? `/vocabulary/${encodeURIComponent(trimmed)}` : null;
}

/**
 * The public page for one radical, addressed by its name.
 *
 * Not by its glyph: WaniKani draws a good number of radicals rather than
 * writing them, and for those the search row shows the name where a kanji row
 * shows a character. An address built from what the row displays would be a
 * request for a character that does not exist.
 */
export function radicalHref(slug: string | null): string | null {
  const trimmed = slug?.trim();
  return trimmed ? `/radicals/${encodeURIComponent(trimmed)}` : null;
}

/**
 * Where a hit leads: to the thing it found.
 *
 * It used to lead to the member's own explorer, carrying the search as a
 * query, on the reasoning that the explorer holds their SRS state and can
 * already find things. What that missed is that an explorer is a list, and a
 * list is free to answer with nothing. The library explorer is built from the
 * member's own levels and stops at theirs, so 水泡 - a real word, level 46,
 * shown to a level 17 member with its meaning and its level right there in the
 * row - opened a page that said "No item matched 水泡". There was no filter to
 * clear and nothing on the results page that could have warned anyone.
 *
 * So every result now names its subject in a path: one kanji, one word or one
 * radical, at an address that holds exactly that. They are public because they
 * carry no member data, which also ends the other half of this bug - a
 * signed-out reader used to get no link at all for a word or a radical, and a
 * row that looks like a link and does nothing is worse than a row that does.
 *
 * It takes no viewer on purpose. Every reader gets the same address, so the
 * signed-out half of the bug cannot come back by somebody forgetting to pass
 * one, and a link copied out of a result is a link that works for whoever it
 * is sent to.
 */
export function searchHitHref(hit: SearchHit): string | null {
  return subjectHref({ subjectType: hit.subjectType, characters: hit.glyph, slug: hit.slug });
}
