import { Prisma } from "@prisma/client";
import { z } from "zod";

import {
  JLPT_CATALOG_ENRICHMENT_FILTERS,
  JLPT_CATALOG_SORT_BY,
  JLPT_CATALOG_SORT_DIR,
  type JlptCatalogQuery,
} from "./jlptCatalogTypes";

/**
 * Reading, filtering and ordering the JLPT catalogue.
 *
 * `JlptKanji` has never had a WaniKani column - kanji, level, readings,
 * meanings, stroke count, school grade, Heisig keyword, word examples, all of
 * it local. The only thing standing between a member with no WaniKani account
 * and this content was where the query lived: three hundred lines of it inside
 * an admin route, behind `isAuthorizedAdmin`.
 *
 * So the query moves here and both routes use it. What differs is what each
 * one returns, and that difference is real rather than incidental: the admin
 * view is about the state of the data - how many readings a row has, when it
 * was last enriched - while a member wants the readings themselves.
 */

const querySchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.coerce.number().int().min(10).max(5000).default(40),
  nLevel: z
    .union([z.literal("all"), z.literal("1"), z.literal("2"), z.literal("3"), z.literal("4"), z.literal("5")])
    .default("all"),
  enrichment: z.enum(JLPT_CATALOG_ENRICHMENT_FILTERS).default("all"),
  /*
   * Whitespace is not a failed request. The old union accepted "" and a
   * trimmed non-empty string but nothing in between, so a search box holding
   * two spaces failed the whole parse and answered 400 - survivable on an
   * admin screen, wrong on a member's.
   */
  search: z.string().max(24).optional(),
  sortBy: z.enum(JLPT_CATALOG_SORT_BY).default("nLevel"),
  sortDir: z.enum(JLPT_CATALOG_SORT_DIR).default("asc"),
  download: z.union([z.literal("0"), z.literal("1"), z.undefined()]).optional(),
});

export function toCatalogQuery(url: URL): JlptCatalogQuery | null {
  const parsed = querySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
    nLevel: url.searchParams.get("nLevel") ?? undefined,
    enrichment: url.searchParams.get("enrichment") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
    sortBy: url.searchParams.get("sortBy") ?? undefined,
    sortDir: url.searchParams.get("sortDir") ?? undefined,
    download: url.searchParams.get("download") ?? undefined,
  });

  if (!parsed.success) {
    return null;
  }

  return {
    page: parsed.data.page,
    pageSize: parsed.data.pageSize,
    nLevel: parsed.data.nLevel === "all" ? null : Number(parsed.data.nLevel),
    enrichment: parsed.data.enrichment,
    search: parsed.data.search?.trim() ? parsed.data.search.trim() : null,
    sortBy: parsed.data.sortBy,
    sortDir: parsed.data.sortDir,
  };
}

export function isDownloadRequest(url: URL): boolean {
  return url.searchParams.get("download") === "1";
}

/** A row that is missing any of the enriched fields, in one place. */
export const MISSING_ENRICHMENT_WHERE: Prisma.JlptKanjiWhereInput = {
  OR: [
    { enrichedAt: null },
    { meanings: { isEmpty: true } },
    { strokeCount: null },
    { heisigKeyword: null },
    { wordExamples: { equals: Prisma.DbNull } },
    { wordExamples: { equals: Prisma.JsonNull } },
  ],
};

export function buildCatalogWhere(query: JlptCatalogQuery): Prisma.JlptKanjiWhereInput {
  const conditions: Prisma.JlptKanjiWhereInput[] = [];

  if (query.nLevel !== null) {
    conditions.push({ nLevel: query.nLevel });
  }

  if (query.enrichment === "enriched") {
    conditions.push({ enrichedAt: { not: null } });
  } else if (query.enrichment === "missing") {
    conditions.push(MISSING_ENRICHMENT_WHERE);
  }

  if (query.search) {
    conditions.push({
      OR: [
        { kanji: { contains: query.search, mode: "insensitive" } },
        { primaryMeaning: { contains: query.search, mode: "insensitive" } },
        { heisigKeyword: { contains: query.search, mode: "insensitive" } },
      ],
    });
  }

  if (conditions.length === 0) return {};
  if (conditions.length === 1) return conditions[0];
  return { AND: conditions };
}

/**
 * Sorted by the chosen column, then always by level and character.
 *
 * The tie-breakers matter more than they look: without them a page of kanji
 * sorted by stroke count comes back in whatever order Postgres feels like, and
 * paging through the catalogue can show the same character twice and skip
 * another entirely.
 */
export function buildCatalogOrderBy(
  query: JlptCatalogQuery,
): Prisma.JlptKanjiOrderByWithRelationInput[] {
  return [{ [query.sortBy]: query.sortDir }, { nLevel: "asc" }, { kanji: "asc" }];
}
