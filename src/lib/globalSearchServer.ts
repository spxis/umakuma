import "server-only";

import { Prisma } from "@prisma/client";

import { SUBJECT_TYPE_DISPLAY, SUBJECT_TYPES, isSubjectType } from "./domainConstants";
import { prisma } from "./prisma";
import { preferOfficialReadings } from "./joyoReadings";
import { querySchoolGradeCatalog } from "./schoolGrades";
import { getAllKanjiDictionaryEntries } from "./kanjiDictionary";
import { searchQueryVariants } from "./kana";
import { countByKind, hitMatchesKind, kindForHit, type SearchKind } from "./searchKinds";
import {
  SEARCH_PER_SOURCE_LIMIT,
  SEARCH_SOURCES,
  SEARCH_SOURCE_VALUES,
  displayMeaning,
  rankMeanings,
  sortHits,
  type SearchHit,
  type SearchResults,
  type SearchSource,
} from "./globalSearch";
import { isKept, type SearchFilters } from "./searchFilters";

export type { SearchResults } from "./globalSearch";

function joined(values: Array<string | null | undefined>): string | null {
  const kept = values.filter((value): value is string => Boolean(value && value.trim()));
  return kept.length > 0 ? kept.join("、") : null;
}

type CatalogRow = {
  wkSubjectId: number;
  subjectType: string;
  level: number;
  characters: string | null;
  slug: string | null;
  meanings: unknown;
  readings: unknown;
};

/** Every meaning the subject carries, so ranking can see past the first. */
function allMeanings(meanings: unknown): string[] {
  if (!Array.isArray(meanings)) return [];
  return meanings
    .map((item) =>
      item && typeof item === "object" ? (item as { meaning?: string }).meaning ?? "" : "",
    )
    .filter((meaning) => meaning.trim().length > 0);
}

function firstMeaning(meanings: unknown): string {
  if (!Array.isArray(meanings)) return "";
  const primary = meanings.find(
    (item) => item && typeof item === "object" && (item as { primary?: boolean }).primary,
  ) as { meaning?: string } | undefined;
  const any = meanings.find(
    (item) => item && typeof item === "object" && typeof (item as { meaning?: string }).meaning === "string",
  ) as { meaning?: string } | undefined;
  return primary?.meaning ?? any?.meaning ?? "";
}

function readingList(readings: unknown): string | null {
  if (!Array.isArray(readings)) return null;
  return joined(
    readings
      .filter((item) => item && typeof item === "object")
      .map((item) => (item as { reading?: string }).reading ?? null),
  );
}

/**
 * WaniKani subjects.
 *
 * Meanings and readings are stored as JSON rather than string columns, so a
 * meaning search cannot be a normal `contains`. Casting the column to text and
 * matching that is coarse but honest at this size, and it is the difference
 * between "pencil" finding 鉛筆 and finding nothing.
 *
 * The ordering matters as much as the filter: a common character like 日 is a
 * substring of hundreds of words, and without putting exact matches first the
 * row the searcher actually wanted can fall outside the limit and never reach
 * the ranking step at all.
 */
async function searchWanikani(variants: string[]): Promise<SearchHit[]> {
  const likes = variants.map((variant) => `%${variant}%`);
  const contains = Prisma.join(
    likes.map(
      (like) =>
        Prisma.sql`"characters" ILIKE ${like} OR "slug" ILIKE ${like} OR "meanings"::text ILIKE ${like} OR "readings"::text ILIKE ${like}`,
    ),
    " OR ",
  );
  const exactCharacters = Prisma.join(
    variants.map((variant) => Prisma.sql`"characters" = ${variant}`),
    " OR ",
  );
  const exactSlug = Prisma.join(
    variants.map((variant) => Prisma.sql`"slug" = ${variant}`),
    " OR ",
  );
  const characterContains = Prisma.join(
    likes.map((like) => Prisma.sql`"characters" ILIKE ${like}`),
    " OR ",
  );

  const rows = await prisma.$queryRaw<CatalogRow[]>`
    SELECT "wkSubjectId", "subjectType", "level", "characters", "slug", "meanings", "readings"
    FROM "WkSubjectCatalog"
    WHERE "hiddenAt" IS NULL
      AND (${contains})
    ORDER BY
      CASE
        WHEN ${exactCharacters} THEN 0
        WHEN ${exactSlug} THEN 1
        WHEN ${characterContains} THEN 2
        ELSE 3
      END,
      "level" ASC
    LIMIT ${Prisma.raw(String(SEARCH_PER_SOURCE_LIMIT * 3))}
  `;

  return rows.map((row) => {
    const glyph = row.characters ?? row.slug ?? String(row.wkSubjectId);
    const primary = firstMeaning(row.meanings);
    const reading = readingList(row.readings);
    const ranked = rankMeanings(variants, glyph, [primary, ...allMeanings(row.meanings)], reading);
    return {
      source: SEARCH_SOURCES.wanikani,
      key: `wanikani:${row.wkSubjectId}`,
      glyph,
      subjectType: row.subjectType,
      /* The subject's own page is addressed by this, so it rides along. */
      slug: row.slug,
      meaning: displayMeaning(primary, ranked.meaning),
      reading,
      badges: [
        isSubjectType(row.subjectType) ? SUBJECT_TYPE_DISPLAY[row.subjectType].short : row.subjectType,
        `L${row.level}`,
      ],
      href: null,
      score: ranked.score,
    } satisfies SearchHit;
  });
}

async function searchJlpt(variants: string[]): Promise<SearchHit[]> {
  const rows = await prisma.jlptKanji.findMany({
    where: {
      OR: variants.flatMap((variant) => [
        { kanji: { contains: variant } },
        { primaryMeaning: { contains: variant, mode: "insensitive" as const } },
        { meanings: { has: variant } },
        { onReadings: { has: variant } },
        { kunReadings: { has: variant } },
        { heisigKeyword: { contains: variant, mode: "insensitive" as const } },
      ]),
    },
    select: {
      kanji: true,
      nLevel: true,
      primaryMeaning: true,
      meanings: true,
      onReadings: true,
      kunReadings: true,
      heisigKeyword: true,
    },
    take: SEARCH_PER_SOURCE_LIMIT * 2,
  });

  return rows.map((row) => {
    const primary = row.primaryMeaning ?? row.meanings[0] ?? "";
    const official = preferOfficialReadings(row.kanji, row.onReadings, row.kunReadings);
    const reading = joined([...official.on, ...official.kun]);
    /* The Heisig keyword is searched, so it has to be ranked, or it is dropped. */
    const ranked = rankMeanings(
      variants,
      row.kanji,
      [primary, ...row.meanings, row.heisigKeyword ?? ""],
      reading,
    );
    return {
      source: SEARCH_SOURCES.jlpt,
      key: `jlpt:${row.kanji}`,
      glyph: row.kanji,
      subjectType: SUBJECT_TYPES.kanji,
      /* Only WaniKani names its subjects; a kanji is addressed by itself. */
      slug: null,
      meaning: displayMeaning(primary, ranked.meaning),
      reading,
      badges: [`N${row.nLevel}`],
      href: null,
      score: ranked.score,
    } satisfies SearchHit;
  });
}

/** School grades live in local JSON, so this one never touches the database. */
function searchGrades(variants: string[]): SearchHit[] {
  const catalogs = variants.map((variant) =>
    querySchoolGradeCatalog({
      page: 1,
      pageSize: SEARCH_PER_SOURCE_LIMIT * 2,
      grade: "all",
      search: variant,
      sortBy: "grade",
      sortDir: "asc",
    }),
  );
  const seen = new Map<string, (typeof catalogs)[number]["items"][number]>();
  for (const catalog of catalogs) {
    for (const entry of catalog.items) {
      if (!seen.has(entry.kanji)) seen.set(entry.kanji, entry);
    }
  }

  return Array.from(seen.values()).map((entry) => {
    const primary = entry.primaryMeaning ?? entry.meanings?.[0] ?? "";
    const gradeReadings = preferOfficialReadings(entry.kanji, entry.readings?.on, entry.readings?.kun);
    const reading = joined([...gradeReadings.on, ...gradeReadings.kun]);
    const ranked = rankMeanings(
      variants,
      entry.kanji,
      [primary, ...(entry.meanings ?? []), entry.heisigKeyword ?? ""],
      reading,
    );
    return {
      source: SEARCH_SOURCES.grades,
      key: `grades:${entry.kanji}`,
      glyph: entry.kanji,
      subjectType: SUBJECT_TYPES.kanji,
      slug: null,
      meaning: displayMeaning(primary, ranked.meaning),
      reading,
      badges: [entry.grade >= 8 ? (entry.grade === 8 ? "Jr High" : "Name") : `G${entry.grade}`],
      grade: entry.grade,
      href: null,
      score: ranked.score,
    } satisfies SearchHit;
  });
}

/**
 * KANJIDIC2, which answers for the characters no catalogue teaches.
 *
 * 渕 and 煕 are both inside the 1,500 most frequent characters in Japanese and
 * neither is in WaniKani, the JLPT table or the school grades, so searching
 * for either returned nothing at all. This is a local read like the school
 * grades - no database - over 10,384 entries the process keeps once loaded.
 */
function searchDictionary(variants: string[]): SearchHit[] {
  const hits: SearchHit[] = [];

  for (const entry of getAllKanjiDictionaryEntries()) {
    const reading = joined([...entry.readings.on, ...entry.readings.kun]);
    const ranked = rankMeanings(variants, entry.kanji, entry.meanings, reading);
    if (ranked.score === 0) continue;

    hits.push({
      source: SEARCH_SOURCES.dictionary,
      key: `dictionary:${entry.kanji}`,
      glyph: entry.kanji,
      subjectType: SUBJECT_TYPES.kanji,
      slug: null,
      meaning: displayMeaning(entry.primaryMeaning, ranked.meaning),
      reading,
      badges: entry.frequencyRank ? [`#${entry.frequencyRank}`] : [],
      href: null,
      score: ranked.score,
    } satisfies SearchHit);
  }

  return sortHits(hits).slice(0, SEARCH_PER_SOURCE_LIMIT * 2);
}

/**
 * Ask every requested catalogue at once.
 *
 * The three run in parallel and a failure in one is not allowed to empty the
 * page: a search that returns two of three answers is far more useful than an
 * error, so a rejected source contributes nothing and the rest still render.
 */
async function collectRanked(query: string, sources: SearchSource[]): Promise<SearchHit[]> {
  const wanted = new Set(sources);
  const variants = searchQueryVariants(query);
  const [wanikani, jlpt, grades] = await Promise.all([
    wanted.has(SEARCH_SOURCES.wanikani) ? searchWanikani(variants).catch(() => []) : Promise.resolve([]),
    wanted.has(SEARCH_SOURCES.jlpt) ? searchJlpt(variants).catch(() => []) : Promise.resolve([]),
    wanted.has(SEARCH_SOURCES.grades) ? Promise.resolve(searchGrades(variants)).catch(() => []) : Promise.resolve([]),
  ]);

  const taught = sortHits([...wanikani, ...jlpt, ...grades].filter((hit) => hit.score > 0));

  /*
   * The dictionary fills gaps rather than adding a fourth copy of every common
   * character: a query for 水 already returns it three times, and a reference
   * row that carries no review state would only be a fourth. Asking for the
   * dictionary on its own is the exception - a column that shows nothing but
   * the gaps would be a strange thing to open - so a lone request skips the
   * coverage filter and answers with everything it holds.
   */
  const dictionaryOnly = wanted.size === 1 && wanted.has(SEARCH_SOURCES.dictionary);
  const covered = new Set(taught.map((hit) => hit.glyph));
  const gapFillers = wanted.has(SEARCH_SOURCES.dictionary)
    ? searchDictionary(variants).filter((hit) => dictionaryOnly || !covered.has(hit.glyph))
    : [];

  return sortHits([...taught, ...gapFillers]);
}

export async function runGlobalSearch(
  query: string,
  sources: SearchSource[],
  window: { limit?: number; offset?: number; kind?: SearchKind | null } = {},
): Promise<SearchResults> {
  const kept = await collectRanked(query, sources);

  /*
   * The kind counts are taken before the kind filter and the source counts
   * after it. A tab has to say how many results it would show while you are
   * looking at a different one, so counting them after filtering would leave
   * every tab but the open one reading zero.
   */
  const countsByKind = countByKind(kept);
  const wantedKind = window.kind ?? null;
  const inKind = wantedKind === null ? kept : kept.filter((hit) => hitMatchesKind(hit, wantedKind));

  /*
   * Windowed after ranking, never during it. The counts and the total describe
   * the whole answer - the tabs would be wrong otherwise - while `hits`
   * carries only the stretch that was asked for, which is ten rows for a
   * dropdown and a screenful for the results page.
   */
  const offset = window.offset ?? 0;
  const windowed =
    window.limit === undefined ? inKind.slice(offset) : inKind.slice(offset, offset + window.limit);

  return {
    query,
    totalHits: inKind.length,
    countsBySource: {
      [SEARCH_SOURCES.wanikani]: inKind.filter((hit) => hit.source === SEARCH_SOURCES.wanikani).length,
      [SEARCH_SOURCES.jlpt]: inKind.filter((hit) => hit.source === SEARCH_SOURCES.jlpt).length,
      [SEARCH_SOURCES.grades]: inKind.filter((hit) => hit.source === SEARCH_SOURCES.grades).length,
      [SEARCH_SOURCES.dictionary]: inKind.filter((hit) => hit.source === SEARCH_SOURCES.dictionary).length,
    },
    countsByKind,
    hits: windowed,
  };
}

/** One catalogue's answer, and how much of it is being shown. */
export type SearchColumnResult = {
  source: SearchSource;
  hits: SearchHit[];
  total: number;
};

export type SearchColumnsResult = {
  query: string;
  totalHits: number;
  countsByKind: ReturnType<typeof countByKind>;
  countsBySource: Record<SearchSource, number>;
  columns: SearchColumnResult[];
};

/**
 * The answer split into one column per catalogue.
 *
 * Not built from a window of the flat ranking, which is the tempting way and
 * the wrong one: the school grades answer a common character with one row that
 * ranks below forty WaniKani rows, so any window wide enough to reach it would
 * be most of the answer. Each catalogue's rows are taken from its own list, so
 * a short column is short because the catalogue is, not because the ranking
 * buried it.
 *
 * Each axis is counted with the other's filter applied but not its own. "Kanji
 * 12" then means twelve kanji among the catalogues you kept, and turning
 * WaniKani off changes it - which is the only reading of the number that
 * stays true as the chips are used.
 */
export async function runSearchColumns(
  query: string,
  filters: SearchFilters,
  perColumn: number,
): Promise<SearchColumnsResult> {
  const ranked = await collectRanked(query, [...SEARCH_SOURCE_VALUES]);

  const inKinds = ranked.filter((hit) => isKept(filters.kinds, kindForHit(hit)));
  const inSources = ranked.filter((hit) => isKept(filters.sources, hit.source));
  const shown = inKinds.filter((hit) => isKept(filters.sources, hit.source));

  const countsBySource = Object.fromEntries(
    SEARCH_SOURCE_VALUES.map((source) => [source, inKinds.filter((hit) => hit.source === source).length]),
  ) as Record<SearchSource, number>;

  const columns = SEARCH_SOURCE_VALUES.map((source) => {
    const all = shown.filter((hit) => hit.source === source);
    return { source, hits: all.slice(0, perColumn), total: all.length };
  }).filter((column) => column.total > 0);

  return {
    query,
    totalHits: shown.length,
    countsByKind: countByKind(inSources),
    countsBySource,
    columns,
  };
}
