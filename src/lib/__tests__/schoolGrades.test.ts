import { describe, expect, it } from "vitest";

import { checkRateLimit } from "../apiRateLimit";
import {
  getSchoolGradeFile,
  getSchoolGradeIndex,
  getSchoolGradeKanjiByCharacter,
  getSchoolGradeMeta,
  querySchoolGradeCatalog,
} from "../schoolGrades";

describe("School Grades Dataset & Utility", () => {
  it("loads the school grade index with exact official character counts", () => {
    const index = getSchoolGradeIndex();
    expect(index).not.toBeNull();
    if (!index) return;

    expect(index.grades).toHaveLength(8);
    expect(index.totalKanjiCount).toBe(2899);
    expect(index.elementaryKanjiCount).toBe(1026);
    expect(index.secondaryKanjiCount).toBe(1110);
    expect(index.nameKanjiCount).toBe(763);

    const gradeCounts = index.grades.map((g) => ({ grade: g.grade, count: g.totalCount }));
    expect(gradeCounts).toEqual([
      { grade: 1, count: 80 },
      { grade: 2, count: 160 },
      { grade: 3, count: 200 },
      { grade: 4, count: 202 },
      { grade: 5, count: 193 },
      { grade: 6, count: 191 },
      { grade: 8, count: 1110 },
      { grade: 9, count: 763 },
    ]);

    const g1Meta = getSchoolGradeMeta(1);
    expect(g1Meta?.name).toBe("First Grade");
    expect(g1Meta?.totalCount).toBe(80);

    const g9Meta = getSchoolGradeMeta(9);
    expect(g9Meta?.category).toBe("name_kanji");
    expect(g9Meta?.totalCount).toBe(763);
  });

  it("loads individual grade datasets with valid metadata and entries", () => {
    for (const grade of [1, 2, 3, 4, 5, 6, 8, 9]) {
      const payload = getSchoolGradeFile(grade);
      expect(payload).not.toBeNull();
      if (!payload) continue;

      expect(payload.grade).toBe(grade);
      expect(payload.slug).toBe(`grade-0${grade}`);
      expect(payload.kanji.length).toBe(payload.totalCount);

      // Verify every kanji entry has valid structure and category metadata
      for (const entry of payload.kanji) {
        expect(entry.kanji).toBeDefined();
        expect(entry.grade).toBe(grade);
        expect(entry.category).toBeDefined();
        expect(entry.category.code).toBeDefined();
        expect(entry.category.name).toBeDefined();
        expect(entry.category.nameJa).toBeDefined();
        expect(entry.category.abbr).toBeDefined();
        expect(entry.unicodeHex).toBeDefined();
        expect(Array.isArray(entry.meanings)).toBe(true);
        expect(Array.isArray(entry.readings.on)).toBe(true);
        expect(Array.isArray(entry.readings.kun)).toBe(true);
      }
    }
  });

  it("fetches single character lookup accurately", () => {
    const kanji1 = getSchoolGradeKanjiByCharacter("一");
    expect(kanji1).not.toBeNull();
    expect(kanji1?.grade).toBe(1);
    expect(kanji1?.unicodeHex).toBe("4e00");
    expect(kanji1?.readings.on).toContain("いち");

    const kanji2 = getSchoolGradeKanjiByCharacter("話");
    expect(kanji2).not.toBeNull();
    expect(kanji2?.grade).toBe(2);

    const kanji4 = getSchoolGradeKanjiByCharacter("茨");
    expect(kanji4).not.toBeNull();
    expect(kanji4?.grade).toBe(4);

    const missing = getSchoolGradeKanjiByCharacter("🦀");
    expect(missing).toBeNull();
  });

  it("supports catalog querying with pagination, sorting, and search", () => {
    // 1. Pagination across all elementary grades
    const page1 = querySchoolGradeCatalog({
      page: 1,
      pageSize: 50,
      grade: "all",
      category: "all",
      search: null,
      strokeMin: null,
      strokeMax: null,
      sortBy: "grade",
      sortDir: "asc",
    });

    expect(page1.pagination.totalItems).toBe(2899);
    expect(page1.pagination.totalPages).toBe(58);
    expect(page1.pagination.page).toBe(1);
    expect(page1.items).toHaveLength(50);

    // 2. Search by meaning
    const searchMeaning = querySchoolGradeCatalog({
      page: 1,
      pageSize: 20,
      grade: "all",
      category: "all",
      search: "water",
      strokeMin: null,
      strokeMax: null,
      sortBy: "grade",
      sortDir: "asc",
    });
    expect(searchMeaning.items.length).toBeGreaterThan(0);
    const hasWater = searchMeaning.items.some((k) => k.kanji === "水");
    expect(hasWater).toBe(true);

    // 3. Search by reading (Hiragana / Katakana)
    const searchReading = querySchoolGradeCatalog({
      page: 1,
      pageSize: 20,
      grade: 1,
      category: "all",
      search: "やま",
      strokeMin: null,
      strokeMax: null,
      sortBy: "grade",
      sortDir: "asc",
    });
    expect(searchReading.items.some((k) => k.kanji === "山")).toBe(true);

    // 4. Filter by specific grade
    const grade2Results = querySchoolGradeCatalog({
      page: 1,
      pageSize: 200,
      grade: 2,
      category: "all",
      search: null,
      strokeMin: null,
      strokeMax: null,
      sortBy: "grade",
      sortDir: "asc",
    });
    expect(grade2Results.pagination.totalItems).toBe(160);
    expect(grade2Results.meta?.nameJa).toBe("小学2年生");
  });

  it("enforces rate limits correctly with sliding window", () => {
    const testKey = `test-ip-${Date.now()}`;
    const opts = { windowMs: 1000, maxRequests: 3 };

    const r1 = checkRateLimit(testKey, opts);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = checkRateLimit(testKey, opts);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = checkRateLimit(testKey, opts);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);

    const r4 = checkRateLimit(testKey, opts);
    expect(r4.allowed).toBe(false);
    expect(r4.remaining).toBe(0);
  });
});
