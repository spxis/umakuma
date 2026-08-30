import fs from "node:fs";
import path from "node:path";

import type {
  SchoolGradeCatalogPagination,
  SchoolGradeCatalogQuery,
  SchoolGradeCatalogResponse,
  SchoolGradeFilePayload,
  SchoolGradeIndexPayload,
  SchoolGradeKanjiEntry,
  SchoolGradeMetaHeader,
} from "./schoolGrades.types";

const DATA_DIR = path.resolve(process.cwd(), "src/data/school-grades");

// In-memory cache for ultra-fast response times
let cachedIndex: SchoolGradeIndexPayload | null = null;
const cachedGradeFiles = new Map<number, SchoolGradeFilePayload>();
let cachedAllKanji: SchoolGradeKanjiEntry[] | null = null;
const cachedKanjiByChar = new Map<string, SchoolGradeKanjiEntry>();

function ensureLoaded(): void {
  if (cachedIndex && cachedAllKanji) {
    return;
  }

  const indexPath = path.join(DATA_DIR, "index.json");
  if (!fs.existsSync(indexPath)) {
    return;
  }

  try {
    const rawIndex = fs.readFileSync(indexPath, "utf8");
    cachedIndex = JSON.parse(rawIndex) as SchoolGradeIndexPayload;

    const allItems: SchoolGradeKanjiEntry[] = [];

    for (const item of cachedIndex.grades) {
      const gradeFilePath = path.join(DATA_DIR, item.filePath);
      if (fs.existsSync(gradeFilePath)) {
        const rawGrade = fs.readFileSync(gradeFilePath, "utf8");
        const parsedGrade = JSON.parse(rawGrade) as SchoolGradeFilePayload;
        cachedGradeFiles.set(item.grade, parsedGrade);

        for (const kanjiEntry of parsedGrade.kanji) {
          allItems.push(kanjiEntry);
          cachedKanjiByChar.set(kanjiEntry.kanji, kanjiEntry);
        }
      }
    }

    cachedAllKanji = allItems;
  } catch (error) {
    console.error("Failed to load school grade datasets:", error);
  }
}

export function getSchoolGradeIndex(): SchoolGradeIndexPayload | null {
  ensureLoaded();
  return cachedIndex;
}

export function getSchoolGradeFile(grade: number): SchoolGradeFilePayload | null {
  ensureLoaded();
  return cachedGradeFiles.get(grade) ?? null;
}

export function getSchoolGradeMeta(grade: number): SchoolGradeMetaHeader | null {
  ensureLoaded();
  const file = cachedGradeFiles.get(grade);
  if (!file) {
    return null;
  }
  const { grade: g, slug, name, nameJa, category, totalCount, curriculum, readingsStandard, updatedAt } = file;
  return { grade: g, slug, name, nameJa, category, totalCount, curriculum, readingsStandard, updatedAt };
}

export function getAllSchoolGradeKanji(): SchoolGradeKanjiEntry[] {
  ensureLoaded();
  return cachedAllKanji ?? [];
}

export function getSchoolGradeKanjiByCharacter(
  character: string,
): SchoolGradeKanjiEntry | null {
  ensureLoaded();
  return cachedKanjiByChar.get(character) ?? null;
}

function matchesSearch(entry: SchoolGradeKanjiEntry, searchLower: string): boolean {
  if (entry.kanji.includes(searchLower)) return true;
  if (entry.primaryMeaning?.toLowerCase().includes(searchLower)) return true;
  if (entry.meanings.some((m) => m.toLowerCase().includes(searchLower))) return true;
  if (entry.heisigKeyword?.toLowerCase().includes(searchLower)) return true;
  if (entry.readings.on.some((r) => r.toLowerCase().includes(searchLower))) return true;
  if (entry.readings.kun.some((r) => r.toLowerCase().includes(searchLower))) return true;
  if (entry.readings.nanori?.some((r) => r.toLowerCase().includes(searchLower))) return true;
  return false;
}

export function querySchoolGradeCatalog(
  query: SchoolGradeCatalogQuery,
): SchoolGradeCatalogResponse {
  ensureLoaded();

  let pool: SchoolGradeKanjiEntry[] = [];
  let meta: SchoolGradeMetaHeader | undefined;

  if (typeof query.grade === "number") {
    const file = cachedGradeFiles.get(query.grade);
    if (file) {
      pool = [...file.kanji];
      const { grade: g, slug, name, nameJa, category, totalCount, curriculum, readingsStandard, updatedAt } = file;
      meta = { grade: g, slug, name, nameJa, category, totalCount, curriculum, readingsStandard, updatedAt };
    }
  } else {
    pool = [...(cachedAllKanji ?? [])];
  }

  // Filter by category
  if (query.category && query.category !== "all") {
    const validGrades = new Set(
      cachedIndex?.grades
        .filter((g) => g.category === query.category)
        .map((g) => g.grade) ?? [],
    );
    pool = pool.filter((item) => validGrades.has(item.grade));
  }

  // Filter by stroke count
  if (typeof query.strokeMin === "number") {
    pool = pool.filter((item) => (item.strokeCount ?? 0) >= query.strokeMin!);
  }
  if (typeof query.strokeMax === "number") {
    pool = pool.filter((item) => (item.strokeCount ?? 0) <= query.strokeMax!);
  }

  // Search filter
  if (query.search && query.search.trim().length > 0) {
    const term = query.search.trim().toLowerCase();
    pool = pool.filter((entry) => matchesSearch(entry, term));
  }

  // Sorting
  const dir = query.sortDir === "desc" ? -1 : 1;
  pool.sort((a, b) => {
    switch (query.sortBy) {
      case "strokeCount":
        return ((a.strokeCount ?? 999) - (b.strokeCount ?? 999)) * dir;
      case "frequency":
        return ((a.frequencyRank ?? 99999) - (b.frequencyRank ?? 99999)) * dir;
      case "unicode":
        return (a.kanji.localeCompare(b.kanji, "ja")) * dir;
      case "kanji":
        return (a.kanji.localeCompare(b.kanji, "ja")) * dir;
      case "grade":
      default:
        if (a.grade !== b.grade) return (a.grade - b.grade) * dir;
        return ((a.strokeCount ?? 999) - (b.strokeCount ?? 999)) * dir;
    }
  });

  // Pagination
  const totalItems = pool.length;
  const page = Math.max(1, query.page);
  const pageSize = Math.max(1, Math.min(query.pageSize, 200));
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (page - 1) * pageSize;
  const items = pool.slice(startIndex, startIndex + pageSize);

  const pagination: SchoolGradeCatalogPagination = {
    page,
    pageSize,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };

  return {
    pagination,
    items,
    ...(meta ? { meta } : {}),
  };
}

export function clearSchoolGradeCache(): void {
  cachedIndex = null;
  cachedGradeFiles.clear();
  cachedAllKanji = null;
  cachedKanjiByChar.clear();
}
