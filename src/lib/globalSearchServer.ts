import "server-only";

import { Prisma } from "@prisma/client";

import { SUBJECT_TYPE_DISPLAY, SUBJECT_TYPES, isSubjectType } from "./domainConstants";
import { prisma } from "./prisma";
import { preferOfficialReadings } from "./joyoReadings";
import { querySchoolGradeCatalog } from "./schoolGrades";
import { searchQueryVariants } from "./kana";
import {
  SEARCH_PER_SOURCE_LIMIT,
  SEARCH_SOURCES,
  rankHitForVariants,
  sortHits,
  type SearchHit,
  type SearchResults,
  type SearchSource,
} from "./globalSearch";

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
    const meaning = firstMeaning(row.meanings);
    const reading = readingList(row.readings);
    return {
      source: SEARCH_SOURCES.wanikani,
      key: `wanikani:${row.wkSubjectId}`,
      glyph,
      subjectType: row.subjectType,
      meaning,
      reading,
      badges: [
        isSubjectType(row.subjectType) ? SUBJECT_TYPE_DISPLAY[row.subjectType].short : row.subjectType,
        `L${row.level}`,
      ],
      href: null,
      score: rankHitForVariants(variants, glyph, meaning, reading),
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
    },
    take: SEARCH_PER_SOURCE_LIMIT * 2,
  });

  return rows.map((row) => {
    const meaning = row.primaryMeaning ?? row.meanings[0] ?? "";
    const official = preferOfficialReadings(row.kanji, row.onReadings, row.kunReadings);
    const reading = joined([...official.on, ...official.kun]);
    return {
      source: SEARCH_SOURCES.jlpt,
      key: `jlpt:${row.kanji}`,
      glyph: row.kanji,
      subjectType: SUBJECT_TYPES.kanji,
      meaning,
      reading,
      badges: [`N${row.nLevel}`],
      href: null,
      score: rankHitForVariants(variants, row.kanji, meaning, reading),
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
    const meaning = entry.primaryMeaning ?? entry.meanings?.[0] ?? "";
    const gradeReadings = preferOfficialReadings(entry.kanji, entry.readings?.on, entry.readings?.kun);
    const reading = joined([...gradeReadings.on, ...gradeReadings.kun]);
    return {
      source: SEARCH_SOURCES.grades,
      key: `grades:${entry.kanji}`,
      glyph: entry.kanji,
      subjectType: SUBJECT_TYPES.kanji,
      meaning,
      reading,
      badges: [entry.grade >= 8 ? (entry.grade === 8 ? "Jr High" : "Name") : `G${entry.grade}`],
      grade: entry.grade,
      href: null,
      score: rankHitForVariants(variants, entry.kanji, meaning, reading),
    } satisfies SearchHit;
  });
}

/**
 * Ask every requested catalogue at once.
 *
 * The three run in parallel and a failure in one is not allowed to empty the
 * page: a search that returns two of three answers is far more useful than an
 * error, so a rejected source contributes nothing and the rest still render.
 */
export async function runGlobalSearch(query: string, sources: SearchSource[]): Promise<SearchResults> {
  const wanted = new Set(sources);
  const variants = searchQueryVariants(query);
  const [wanikani, jlpt, grades] = await Promise.all([
    wanted.has(SEARCH_SOURCES.wanikani) ? searchWanikani(variants).catch(() => []) : Promise.resolve([]),
    wanted.has(SEARCH_SOURCES.jlpt) ? searchJlpt(variants).catch(() => []) : Promise.resolve([]),
    wanted.has(SEARCH_SOURCES.grades) ? Promise.resolve(searchGrades(variants)).catch(() => []) : Promise.resolve([]),
  ]);

  const kept = sortHits([...wanikani, ...jlpt, ...grades].filter((hit) => hit.score > 0));

  return {
    query,
    totalHits: kept.length,
    countsBySource: {
      [SEARCH_SOURCES.wanikani]: kept.filter((hit) => hit.source === SEARCH_SOURCES.wanikani).length,
      [SEARCH_SOURCES.jlpt]: kept.filter((hit) => hit.source === SEARCH_SOURCES.jlpt).length,
      [SEARCH_SOURCES.grades]: kept.filter((hit) => hit.source === SEARCH_SOURCES.grades).length,
    },
    hits: kept,
  };
}
