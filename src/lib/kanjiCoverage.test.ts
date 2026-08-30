import { describe, expect, it } from "vitest";

import {
  KANJI_GRADE_BANDS,
  KANJI_SOURCES,
  buildKanjiCoverage,
  gradeBand,
  missingFromWanikani,
  summarizeKanjiCoverage,
  type JlptCoverageRow,
  type WanikaniCoverageRow,
} from "./kanjiCoverage";

function jlpt(overrides: Partial<JlptCoverageRow> = {}): JlptCoverageRow {
  return {
    kanji: "一",
    nLevel: 5,
    schoolGrade: 1,
    frequencyRank: 2,
    primaryMeaning: "one",
    ...overrides,
  };
}

function wk(overrides: Partial<WanikaniCoverageRow> = {}): WanikaniCoverageRow {
  return { characters: "一", wkSubjectId: 440, level: 1, ...overrides };
}

describe("gradeBand", () => {
  it("treats grades 1 to 6 as grade school", () => {
    for (const grade of [1, 2, 3, 4, 5, 6]) {
      expect(gradeBand(grade)).toBe(KANJI_GRADE_BANDS.gradeSchool);
    }
  });

  it("treats grade 8 as secondary, the jouyou kanji taught later", () => {
    expect(gradeBand(8)).toBe(KANJI_GRADE_BANDS.secondary);
  });

  it("treats grades 9 and 10 as name kanji", () => {
    expect(gradeBand(9)).toBe(KANJI_GRADE_BANDS.nameKanji);
    expect(gradeBand(10)).toBe(KANJI_GRADE_BANDS.nameKanji);
  });

  it("does not invent a band for a missing or nonsense grade", () => {
    expect(gradeBand(null)).toBe(KANJI_GRADE_BANDS.unclassified);
    expect(gradeBand(undefined)).toBe(KANJI_GRADE_BANDS.unclassified);
    expect(gradeBand(0)).toBe(KANJI_GRADE_BANDS.unclassified);
  });

  it("does not treat grade 7 as school, since KANJIDIC never assigns it", () => {
    expect(gradeBand(7)).toBe(KANJI_GRADE_BANDS.unclassified);
  });
});

describe("buildKanjiCoverage", () => {
  it("marks a kanji in both catalogues and carries its WaniKani level", () => {
    const [entry] = buildKanjiCoverage([jlpt()], [wk({ level: 3 })]);

    expect(entry.source).toBe(KANJI_SOURCES.both);
    expect(entry.wkLevel).toBe(3);
    expect(entry.wkSubjectId).toBe(440);
  });

  it("marks a JLPT kanji WaniKani does not teach", () => {
    const [entry] = buildKanjiCoverage([jlpt({ kanji: "亜" })], []);

    expect(entry.source).toBe(KANJI_SOURCES.jlptOnly);
    expect(entry.wkLevel).toBeNull();
  });

  it("includes a WaniKani kanji the JLPT table has never heard of", () => {
    const entries = buildKanjiCoverage([], [wk({ characters: "嗅", wkSubjectId: 9, level: 42 })]);

    expect(entries).toHaveLength(1);
    expect(entries[0].source).toBe(KANJI_SOURCES.wanikaniOnly);
    expect(entries[0].nLevel).toBeNull();
    expect(entries[0].wkLevel).toBe(42);
  });

  it("never counts the same kanji twice", () => {
    const entries = buildKanjiCoverage([jlpt()], [wk()]);
    expect(entries).toHaveLength(1);
  });

  it("skips WaniKani rows with no characters rather than matching on null", () => {
    const entries = buildKanjiCoverage([], [wk({ characters: null })]);
    expect(entries).toEqual([]);
  });

  it("bands a JLPT-only kanji by its school grade", () => {
    const [entry] = buildKanjiCoverage([jlpt({ kanji: "亜", schoolGrade: 8 })], []);
    expect(entry.band).toBe(KANJI_GRADE_BANDS.secondary);
  });
});

describe("summarizeKanjiCoverage", () => {
  it("counts each source", () => {
    const entries = buildKanjiCoverage(
      [jlpt({ kanji: "一" }), jlpt({ kanji: "亜", schoolGrade: 8, nLevel: 1 })],
      [wk({ characters: "一" }), wk({ characters: "嗅", wkSubjectId: 9, level: 42 })],
    );

    const totals = summarizeKanjiCoverage(entries);

    expect(totals.total).toBe(3);
    expect(totals.bySource.both).toBe(1);
    expect(totals.bySource.jlptOnly).toBe(1);
    expect(totals.bySource.wanikaniOnly).toBe(1);
  });

  it("breaks the WaniKani gap down by band and JLPT level", () => {
    const entries = buildKanjiCoverage(
      [
        jlpt({ kanji: "亜", schoolGrade: 8, nLevel: 1 }),
        jlpt({ kanji: "阿", schoolGrade: 9, nLevel: 1 }),
      ],
      [],
    );

    const totals = summarizeKanjiCoverage(entries);

    expect(totals.missingFromWanikaniByBand.secondary).toBe(1);
    expect(totals.missingFromWanikaniByBand.nameKanji).toBe(1);
    expect(totals.missingFromWanikaniByBand.gradeSchool).toBe(0);
    expect(totals.missingFromWanikaniByNLevel[1]).toBe(2);
  });

  it("does not count covered kanji as part of the gap", () => {
    const totals = summarizeKanjiCoverage(buildKanjiCoverage([jlpt()], [wk()]));

    expect(totals.missingFromWanikaniByBand.gradeSchool).toBe(0);
    expect(totals.missingFromWanikaniByNLevel).toEqual({});
  });
});

describe("missingFromWanikani", () => {
  it("returns only the kanji WaniKani lacks", () => {
    const entries = buildKanjiCoverage(
      [jlpt({ kanji: "一" }), jlpt({ kanji: "亜", schoolGrade: 8 })],
      [wk({ characters: "一" })],
    );

    expect(missingFromWanikani(entries).map((entry) => entry.kanji)).toEqual(["亜"]);
  });

  it("orders by frequency so the commonest gap comes first", () => {
    const entries = buildKanjiCoverage(
      [
        jlpt({ kanji: "鬱", frequencyRank: 1800 }),
        jlpt({ kanji: "亜", frequencyRank: 1500 }),
      ],
      [],
    );

    expect(missingFromWanikani(entries).map((entry) => entry.kanji)).toEqual(["亜", "鬱"]);
  });

  it("sorts kanji with no frequency rank last, not first", () => {
    const entries = buildKanjiCoverage(
      [jlpt({ kanji: "袁", frequencyRank: null }), jlpt({ kanji: "亜", frequencyRank: 1500 })],
      [],
    );

    expect(missingFromWanikani(entries).map((entry) => entry.kanji)).toEqual(["亜", "袁"]);
  });
});
