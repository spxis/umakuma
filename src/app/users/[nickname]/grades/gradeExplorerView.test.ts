import { describe, expect, it } from "vitest";

import type { SchoolGradeKanjiEntry } from "@/lib/schoolGrades.types";

import {
  GRADE_OPTIONS,
  GRADE_REVEAL_MODES,
  GRADE_REVEAL_STORAGE_KEY,
  GRADE_SHORT_LABELS,
  displayReading,
  gradeHref,
  isGradeOption,
  pageRange,
  parseGradeParam,
  parsePageParam,
  readingsForGrade,
  standaloneReadings,
} from "./gradeExplorerView";

function entry(overrides: Partial<SchoolGradeKanjiEntry> = {}): SchoolGradeKanjiEntry {
  return {
    kanji: "引",
    grade: 2,
    readings: { on: ["いん"], kun: ["ひ", "ひ.く"] },
    gradeApprovedReadings: { on: ["いん"], kun: ["ひ.く"] },
    ...overrides,
  } as SchoolGradeKanjiEntry;
}

describe("parseGradeParam", () => {
  it("takes a grade the explorer offers", () => {
    expect(parseGradeParam("2")).toBe(2);
    expect(parseGradeParam("9")).toBe(9);
  });

  it("falls back for a grade that does not exist", () => {
    // 7 is deliberately absent: KANJIDIC jumps 6 to 8.
    expect(parseGradeParam("7")).toBe(1);
    expect(parseGradeParam("nonsense")).toBe(1);
    expect(parseGradeParam(undefined)).toBe(1);
  });
});

describe("parsePageParam", () => {
  it("defaults to the first page for anything unusable", () => {
    expect(parsePageParam(undefined)).toBe(1);
    expect(parsePageParam("0")).toBe(1);
    expect(parsePageParam("-3")).toBe(1);
    expect(parsePageParam("x")).toBe(1);
  });

  it("keeps a real page number", () => {
    expect(parsePageParam("4")).toBe(4);
  });
});

describe("readingsForGrade", () => {
  /*
   * A kanji carries every reading it has, but a school year teaches only some,
   * and the narrower set is what the test asks for.
   */
  it("prefers the readings approved for the grade", () => {
    expect(readingsForGrade(entry()).kun).toEqual(["ひ.く"]);
  });

  it("falls back to the full set rather than showing nothing", () => {
    const withoutApproved = entry({ gradeApprovedReadings: { on: [], kun: [] } });
    expect(readingsForGrade(withoutApproved).kun).toEqual(["ひ", "ひ.く"]);
  });

  it("survives an entry with no readings at all", () => {
    const bare = entry({ readings: { on: [], kun: [] }, gradeApprovedReadings: { on: [], kun: [] } });
    expect(readingsForGrade(bare)).toEqual({ on: [], kun: [] });
  });
});

describe("displayReading", () => {
  /*
   * The dot in `ひ.く` marks where the kanji stops and the okurigana starts. It
   * is a dictionary convention, not something a child writes on a test.
   */
  it("drops the okurigana marker", () => {
    expect(displayReading("ひ.く")).toBe("ひく");
    expect(displayReading("ひ.ける")).toBe("ひける");
  });

  it("leaves a reading without one alone", () => {
    expect(displayReading("いん")).toBe("いん");
  });
});

describe("grade options", () => {
  it("labels the two non-year bands by name, not as a year", () => {
    expect(GRADE_SHORT_LABELS[8]).toBe("Jr High");
    expect(GRADE_SHORT_LABELS[9]).toBe("Name");
  });

  it("labels every option it offers", () => {
    for (const option of GRADE_OPTIONS) {
      expect(GRADE_SHORT_LABELS[option]).toBeTruthy();
    }
  });

  it("rejects a grade outside the set", () => {
    expect(isGradeOption(7)).toBe(false);
    expect(isGradeOption(2)).toBe(true);
  });
});

describe("gradeHref", () => {
  it("keeps the url clean on the first page with no search", () => {
    expect(gradeHref("john", 2)).toBe("/users/john/grades?grade=2");
  });

  it("carries the page and search when they matter", () => {
    expect(gradeHref("john", 3, 2, "water")).toBe("/users/john/grades?grade=3&page=2&q=water");
  });
});

describe("pageRange", () => {
  it("counts from one for the reader", () => {
    expect(pageRange(1, 160)).toEqual({ first: 1, last: 60 });
    expect(pageRange(3, 160)).toEqual({ first: 121, last: 160 });
  });

  it("shows nothing for an empty result", () => {
    expect(pageRange(1, 0)).toEqual({ first: 0, last: 0 });
  });
});

describe("quiz mode", () => {
  it("offers exactly the two states the board toggles between", () => {
    expect(Object.values(GRADE_REVEAL_MODES)).toEqual(["shown", "hidden"]);
  });

  /*
   * Scoped to this surface so quiz mode survives paging through a grade without
   * leaking into the other list surfaces that share the storage helpers.
   */
  it("stores the choice under its own key", () => {
    expect(GRADE_REVEAL_STORAGE_KEY).toBe("wr:grades:reveal-mode");
  });
});

describe("standaloneReadings", () => {
  /*
   * KANJIDIC hyphenates a form that only exists attached to something else.
   * 王 has no kun reading; its only listed one is `-のう`, which exists solely
   * inside a compound like 親王, and printing it taught the opposite.
   */
  it("drops a compound-only suffix", () => {
    expect(standaloneReadings(["-のう"])).toEqual([]);
  });

  it("drops a compound-only prefix", () => {
    expect(standaloneReadings(["ひ", "ほ", "-び", "ほ-"])).toEqual(["ひ", "ほ"]);
  });

  it("keeps an ordinary reading and an okurigana one", () => {
    expect(standaloneReadings(["おと", "ね", "い.きる"])).toEqual(["おと", "ね", "い.きる"]);
  });

  it("survives a missing list", () => {
    expect(standaloneReadings(undefined)).toEqual([]);
  });
});

describe("readingsForGrade filters compound-only forms", () => {
  it("leaves a kanji with no standalone kun reading showing none", () => {
    const king = entry({ readings: { on: ["おう"], kun: ["-のう"] }, gradeApprovedReadings: { on: ["おう"], kun: ["-のう"] } });
    expect(readingsForGrade(king)).toEqual({ on: ["おう"], kun: [] });
  });
});
