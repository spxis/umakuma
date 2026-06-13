import type { Prisma } from "@prisma/client";

import { isSubjectType } from "@/lib/domainConstants";
import { prisma } from "@/lib/prisma";

import type {
  CatalogBrowseQuery,
  CatalogBrowseResponse,
  CatalogCategoryFilter,
  CatalogRowCategory,
  CatalogSortBy,
  CatalogSubjectTypeFilter,
} from "./catalogBrowseTypes";

function buildSearchWhere(search: string | null): Prisma.WkSubjectCatalogWhereInput | null {
  if (!search) {
    return null;
  }

  const numericId = Number(search);

  const textFields: Prisma.WkSubjectCatalogWhereInput[] = [
    { slug: { contains: search, mode: "insensitive" } },
    { characters: { contains: search, mode: "insensitive" } },
    { meaningMnemonic: { contains: search, mode: "insensitive" } },
    { meaningHint: { contains: search, mode: "insensitive" } },
    { readingMnemonic: { contains: search, mode: "insensitive" } },
    { readingHint: { contains: search, mode: "insensitive" } },
  ];

  if (Number.isInteger(numericId) && numericId > 0) {
    textFields.push({ wkSubjectId: numericId });
  }

  return { OR: textFields };
}

function buildCategoryWhere(category: CatalogCategoryFilter): Prisma.WkSubjectCatalogWhereInput | null {
  if (category === "all") {
    return null;
  }

  if (category === "active") {
    return { hiddenAt: null };
  }

  if (category === "hidden") {
    return { hiddenAt: { not: null } };
  }

  if (category === "character") {
    return { characters: { not: null } };
  }

  return { characters: null };
}

function buildTypeWhere(type: CatalogSubjectTypeFilter): Prisma.WkSubjectCatalogWhereInput | null {
  if (type === "all") {
    return null;
  }

  return { subjectType: type };
}

function buildLevelWhere(levelMin: number | null, levelMax: number | null): Prisma.WkSubjectCatalogWhereInput | null {
  if (levelMin === null && levelMax === null) {
    return null;
  }

  const range: Prisma.IntFilter = {};
  if (levelMin !== null) {
    range.gte = levelMin;
  }
  if (levelMax !== null) {
    range.lte = levelMax;
  }

  return { level: range };
}

function mergeWhere(
  ...parts: Array<Prisma.WkSubjectCatalogWhereInput | null>
): Prisma.WkSubjectCatalogWhereInput {
  const activeParts = parts.filter((part): part is Prisma.WkSubjectCatalogWhereInput => Boolean(part));
  if (activeParts.length === 0) {
    return {};
  }

  if (activeParts.length === 1) {
    return activeParts[0];
  }

  return { AND: activeParts };
}

function buildOrderBy(sortBy: CatalogSortBy, sortDir: "asc" | "desc"): Prisma.WkSubjectCatalogOrderByWithRelationInput[] {
  const primary: Prisma.WkSubjectCatalogOrderByWithRelationInput = { [sortBy]: sortDir };

  return [
    primary,
    { level: "asc" },
    { subjectType: "asc" },
    { wkSubjectId: "asc" },
  ];
}

function normalizeSubjectType(input: string): "radical" | "kanji" | "vocabulary" {
  if (isSubjectType(input)) {
    return input;
  }

  return "vocabulary";
}

function pickPrimaryMeaning(rawMeanings: unknown): string | null {
  if (!Array.isArray(rawMeanings)) {
    return null;
  }

  for (const item of rawMeanings) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const row = item as Record<string, unknown>;
    if (typeof row.meaning === "string" && row.meaning.trim().length > 0) {
      return row.meaning;
    }
  }

  return null;
}

function toBrowseCategory(row: { hiddenAt: Date | null; characters: string | null }): CatalogRowCategory {
  if (row.hiddenAt) {
    return "hidden";
  }

  if (row.characters && row.characters.trim().length > 0) {
    return "character";
  }

  return "imageBased";
}

function emptyTypeCounts(): Record<CatalogSubjectTypeFilter, number> {
  return {
    all: 0,
    radical: 0,
    kanji: 0,
    vocabulary: 0,
  };
}

function emptyCategoryCounts(): Record<CatalogCategoryFilter, number> {
  return {
    all: 0,
    active: 0,
    hidden: 0,
    character: 0,
    imageBased: 0,
  };
}

export async function getCatalogBrowseData(query: CatalogBrowseQuery): Promise<Omit<CatalogBrowseResponse, "meta">> {
  const page = Math.max(1, query.page);
  const pageSize = Math.max(10, Math.min(100, query.pageSize));

  const levelWhere = buildLevelWhere(query.levelMin, query.levelMax);
  const searchWhere = buildSearchWhere(query.search);
  const baseWhere = mergeWhere(levelWhere, searchWhere);

  const typeWhere = buildTypeWhere(query.type);
  const categoryWhere = buildCategoryWhere(query.category);
  const listWhere = mergeWhere(baseWhere, typeWhere, categoryWhere);

  const orderBy = buildOrderBy(query.sortBy, query.sortDir);

  const [overallTotal, filteredTotal, rows, byTypeRows, aggregateBounds, activeCount, hiddenCount, characterCount, imageBasedCount] = await prisma.$transaction([
    prisma.wkSubjectCatalog.count(),
    prisma.wkSubjectCatalog.count({ where: listWhere }),
    prisma.wkSubjectCatalog.findMany({
      where: listWhere,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        wkSubjectId: true,
        subjectType: true,
        level: true,
        slug: true,
        characters: true,
        meanings: true,
        hiddenAt: true,
        dataUpdatedAt: true,
        updatedAt: true,
        documentUrl: true,
      },
    }),
    prisma.wkSubjectCatalog.groupBy({
      by: ["subjectType"],
      where: baseWhere,
      _count: { _all: true },
    }),
    prisma.wkSubjectCatalog.aggregate({
      where: baseWhere,
      _min: { level: true },
      _max: { level: true },
    }),
    prisma.wkSubjectCatalog.count({ where: mergeWhere(baseWhere, { hiddenAt: null }) }),
    prisma.wkSubjectCatalog.count({ where: mergeWhere(baseWhere, { hiddenAt: { not: null } }) }),
    prisma.wkSubjectCatalog.count({ where: mergeWhere(baseWhere, { hiddenAt: null }, { characters: { not: null } }) }),
    prisma.wkSubjectCatalog.count({ where: mergeWhere(baseWhere, { hiddenAt: null }, { characters: null }) }),
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredTotal / pageSize));
  const normalizedPage = Math.min(page, totalPages);

  const typeCounts = emptyTypeCounts();
  for (const row of byTypeRows) {
    if (row.subjectType === "radical" || row.subjectType === "kanji" || row.subjectType === "vocabulary") {
      typeCounts[row.subjectType] = row._count._all;
    }
  }
  typeCounts.all = typeCounts.radical + typeCounts.kanji + typeCounts.vocabulary;

  const categoryCounts = emptyCategoryCounts();
  categoryCounts.all = typeCounts.all;
  categoryCounts.active = activeCount;
  categoryCounts.hidden = hiddenCount;
  categoryCounts.character = characterCount;
  categoryCounts.imageBased = imageBasedCount;

  return {
    now: new Date().toISOString(),
    filters: {
      applied: {
        ...query,
        page: normalizedPage,
        pageSize,
      },
      facets: {
        byType: typeCounts,
        byCategory: categoryCounts,
        levelBounds: {
          min: aggregateBounds._min.level ?? null,
          max: aggregateBounds._max.level ?? null,
        },
      },
    },
    pagination: {
      page: normalizedPage,
      pageSize,
      total: filteredTotal,
      totalPages,
      hasNext: normalizedPage < totalPages,
      hasPrevious: normalizedPage > 1,
    },
    totals: {
      overallSubjects: overallTotal,
      filteredSubjects: filteredTotal,
    },
    items: rows.map((row) => ({
      wkSubjectId: row.wkSubjectId,
      subjectType: normalizeSubjectType(row.subjectType),
      level: row.level,
      slug: row.slug,
      characters: row.characters,
      primaryMeaning: pickPrimaryMeaning(row.meanings),
      category: toBrowseCategory({ hiddenAt: row.hiddenAt, characters: row.characters }),
      hiddenAt: row.hiddenAt?.toISOString() ?? null,
      dataUpdatedAt: row.dataUpdatedAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      documentUrl: row.documentUrl,
    })),
  };
}
