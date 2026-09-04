import { SUBJECT_TYPE_VALUES, type SubjectType } from "@/lib/domainConstants";
import { KANJI_GRADE_BAND_VALUES, type KanjiGradeBand } from "@/lib/kanjiCoverage";

import { LADDER_SOURCE_VALUES, type LadderRow, type LadderSource } from "./ladderCrosswalk";

/**
 * Searching and paging the crosswalk.
 *
 * Kept apart from building it because the build is expensive and the answer is
 * the same for everybody: the rows are made once and held, and every request
 * only filters and slices what is already in memory. The same split
 * `AdminCatalogBrowser` makes against the catalogue, minus the database.
 */

export const LADDER_PAGE_SIZES = [25, 50, 100, 250] as const;
export const LADDER_DEFAULT_PAGE_SIZE = 50;

export type LadderQuery = {
  page: number;
  pageSize: number;
  search: string;
  kind: SubjectType | null;
  source: LadderSource | null;
  band: KanjiGradeBand | null;
  nLevel: number | null;
  /** Inclusive bounds on our own level. */
  ukLevelMin: number | null;
  ukLevelMax: number | null;
  /** Rows WaniKani does not teach, which is the gap the ladder had to fill. */
  onlyMissingFromWanikani: boolean;
};

export type LadderFacets = {
  kind: Record<string, number>;
  source: Record<string, number>;
  band: Record<string, number>;
};

export type LadderQueryResult = {
  rows: LadderRow[];
  total: number;
  page: number;
  pageSize: number;
  facets: LadderFacets;
};

export const EMPTY_LADDER_QUERY: LadderQuery = {
  page: 1,
  pageSize: LADDER_DEFAULT_PAGE_SIZE,
  search: "",
  kind: null,
  source: null,
  band: null,
  nLevel: null,
  ukLevelMin: null,
  ukLevelMax: null,
  onlyMissingFromWanikani: false,
};

/** Matches the glyph and the meaning, because both are how a row is looked for. */
function matches(row: LadderRow, needle: string): boolean {
  if (!needle) return true;
  const lowered = needle.toLowerCase();
  return (
    row.characters.includes(needle) ||
    row.characters.toLowerCase().includes(lowered) ||
    (row.primaryMeaning?.toLowerCase().includes(lowered) ?? false) ||
    row.key.toLowerCase().includes(lowered)
  );
}

function passes(row: LadderRow, query: LadderQuery): boolean {
  if (query.kind && row.kind !== query.kind) return false;
  if (query.source && row.source !== query.source) return false;
  if (query.band && row.band !== query.band) return false;
  if (query.nLevel !== null && row.nLevel !== query.nLevel) return false;
  if (query.ukLevelMin !== null && row.ukLevel < query.ukLevelMin) return false;
  if (query.ukLevelMax !== null && row.ukLevel > query.ukLevelMax) return false;
  if (query.onlyMissingFromWanikani && row.wkLevel !== null) return false;
  return matches(row, query.search.trim());
}

function countBy(rows: readonly LadderRow[], values: readonly string[], read: (row: LadderRow) => string): Record<string, number> {
  const counts = Object.fromEntries(values.map((value) => [value, 0]));
  for (const row of rows) {
    const value = read(row);
    if (value in counts) counts[value] += 1;
  }
  return counts;
}

/**
 * The rows a query asks for, with the counts the chips above them show.
 *
 * Facets are counted over everything the *other* filters allow, so a chip's
 * number tells you what you would get by pressing it rather than what you have
 * already got.
 */
export function queryLadder(rows: readonly LadderRow[], query: LadderQuery): LadderQueryResult {
  const found = rows.filter((row) => passes(row, query));

  const withoutKind = rows.filter((row) => passes(row, { ...query, kind: null }));
  const withoutSource = rows.filter((row) => passes(row, { ...query, source: null }));
  const withoutBand = rows.filter((row) => passes(row, { ...query, band: null }));

  const pages = Math.max(1, Math.ceil(found.length / query.pageSize));
  const page = Math.min(Math.max(1, query.page), pages);
  const start = (page - 1) * query.pageSize;

  return {
    rows: found.slice(start, start + query.pageSize),
    total: found.length,
    page,
    pageSize: query.pageSize,
    facets: {
      kind: countBy(withoutKind, SUBJECT_TYPE_VALUES, (row) => row.kind),
      source: countBy(withoutSource, LADDER_SOURCE_VALUES, (row) => row.source),
      band: countBy(withoutBand, KANJI_GRADE_BAND_VALUES, (row) => row.band),
    },
  };
}

export type LadderLevelSummary = {
  level: number;
  nLevel: number | null;
  radicals: number;
  kanji: number;
  vocabulary: number;
  total: number;
  /** Kanji at this level that WaniKani never teaches. */
  added: number;
};

/**
 * What each level holds, which is the shape of the ladder rather than its
 * contents - the thing to look at before deciding a level is too heavy.
 */
export function summarizeLadderLevels(rows: readonly LadderRow[], levels: number): LadderLevelSummary[] {
  const summaries: LadderLevelSummary[] = Array.from({ length: levels }, (_, index) => ({
    level: index + 1,
    nLevel: null,
    radicals: 0,
    kanji: 0,
    vocabulary: 0,
    total: 0,
    added: 0,
  }));

  for (const row of rows) {
    const summary = summaries[row.ukLevel - 1];
    if (!summary) continue;
    summary.total += 1;
    if (row.kind === "radical") summary.radicals += 1;
    if (row.kind === "vocabulary") summary.vocabulary += 1;
    if (row.kind === "kanji") {
      summary.kanji += 1;
      if (row.wkLevel === null) summary.added += 1;
      /* A level's band is its kanji's, and a level never mixes two. */
      if (row.nLevel !== null) summary.nLevel = row.nLevel;
    }
  }

  return summaries;
}

export type LadderLevelGroup = {
  level: number;
  nLevel: number | null;
  radicals: LadderRow[];
  kanji: LadderRow[];
  vocabulary: LadderRow[];
  /** Kanji taught up to and including this level. */
  kanjiThrough: number;
  wordsThrough: number;
};

/** How many levels one page of the level view shows. */
export const LADDER_LEVELS_PER_PAGE = 10;

/**
 * The ladder read a level at a time, rather than a row at a time.
 *
 * A table answers "where is this kanji"; this answers "what is a level made
 * of", which is the question anybody deciding whether a level is fair actually
 * asks. Radicals, then that level's kanji, then its words — the order a level
 * is met in, and the order the build placed them.
 */
export function groupLadderByLevel(
  rows: readonly LadderRow[],
  levels: number,
  page = 1,
  pageSize = LADDER_LEVELS_PER_PAGE,
): { groups: LadderLevelGroup[]; page: number; pageCount: number } {
  const byLevel = new Map<number, LadderRow[]>();
  for (const row of rows) {
    const held = byLevel.get(row.ukLevel);
    if (held) held.push(row);
    else byLevel.set(row.ukLevel, [row]);
  }

  const pageCount = Math.max(1, Math.ceil(levels / pageSize));
  const wanted = Math.min(Math.max(1, page), pageCount);
  const first = (wanted - 1) * pageSize + 1;
  const last = Math.min(levels, first + pageSize - 1);

  /* Running totals are over the whole ladder, not the page, so a level on
     page five still says how much a member knows by the time they reach it. */
  let kanjiThrough = 0;
  let wordsThrough = 0;
  const groups: LadderLevelGroup[] = [];

  for (let level = 1; level <= last; level += 1) {
    const held = byLevel.get(level) ?? [];
    const kanji = held.filter((row) => row.kind === "kanji");
    const vocabulary = held.filter((row) => row.kind === "vocabulary");
    kanjiThrough += kanji.length;
    wordsThrough += vocabulary.length;
    if (level < first) continue;

    groups.push({
      level,
      nLevel: kanji.find((row) => row.nLevel !== null)?.nLevel ?? null,
      radicals: held.filter((row) => row.kind === "radical"),
      kanji,
      vocabulary,
      kanjiThrough,
      wordsThrough,
    });
  }

  return { groups, page: wanted, pageCount };
}
