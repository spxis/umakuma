import "server-only";

import {
  buildCatalogOrderBy,
  buildCatalogWhere,
} from "./jlptCatalogQuery";
import type { JlptCatalogQuery } from "./jlptCatalogTypes";
import { prisma } from "./prisma";

/**
 * The JLPT catalogue as study content.
 *
 * The admin view of the same table reports on the *state* of the data - how
 * many readings a row has, when it was last enriched, which rows are still
 * missing a Heisig keyword. Useful for keeping the catalogue healthy and
 * useless for learning from: a member wants the readings, not a count of them.
 *
 * Nothing here touches WaniKani. That is the whole point - this is the content
 * a member with no WaniKani account can still study, and it was only ever
 * unreachable because the query lived behind an admin gate.
 */

export type JlptStudyItem = {
  kanji: string;
  nLevel: number;
  primaryMeaning: string | null;
  meanings: string[];
  on: string[];
  kun: string[];
  strokeCount: number | null;
  /** Japanese school grade, where the character has one. */
  schoolGrade: number | null;
  heisigKeyword: string | null;
  frequencyRank: number | null;
};

export type JlptStudyPage = {
  items: JlptStudyItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  /** How many characters sit at each level, for the filter chips. */
  byLevel: Record<number, number>;
};

export async function fetchJlptStudyPage(query: JlptCatalogQuery): Promise<JlptStudyPage> {
  const where = buildCatalogWhere(query);

  const [total, byLevelRows] = await Promise.all([
    prisma.jlptKanji.count({ where }),
    prisma.jlptKanji.groupBy({ by: ["nLevel"], _count: { _all: true } }),
  ]);

  /*
   * Clamped rather than trusted. A member who is on page 40 and then filters
   * down to one level would otherwise get an empty page and no way to tell
   * whether that means "no results" or "you are past the end".
   */
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
  const page = Math.min(query.page, totalPages);

  const rows = await prisma.jlptKanji.findMany({
    where,
    orderBy: buildCatalogOrderBy(query),
    skip: (page - 1) * query.pageSize,
    take: query.pageSize,
    select: {
      kanji: true,
      nLevel: true,
      primaryMeaning: true,
      meanings: true,
      onReadings: true,
      kunReadings: true,
      strokeCount: true,
      schoolGrade: true,
      heisigKeyword: true,
      frequencyRank: true,
    },
  });

  const byLevel: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of byLevelRows) {
    byLevel[row.nLevel] = row._count._all;
  }

  return {
    items: rows.map((row) => ({
      kanji: row.kanji,
      nLevel: row.nLevel,
      primaryMeaning: row.primaryMeaning,
      meanings: row.meanings,
      on: row.onReadings,
      kun: row.kunReadings,
      strokeCount: row.strokeCount,
      schoolGrade: row.schoolGrade,
      heisigKeyword: row.heisigKeyword,
      frequencyRank: row.frequencyRank,
    })),
    pagination: {
      page,
      pageSize: query.pageSize,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
    byLevel,
  };
}
