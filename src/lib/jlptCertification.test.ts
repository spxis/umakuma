import { describe, expect, it } from "vitest";

import {
  CLASSIC_LEVEL_BENCHMARKS,
  JLPT_FIRST_YEAR,
  JLPT_SYSTEMS,
  formatJlptLevel,
  isClassicLevel,
  isModernLevel,
  jlptSystemForYear,
  levelsForSystem,
  toModernLevel,
} from "./jlptCertification";


describe("jlptSystemForYear", () => {
  it("treats 2009 and earlier as the old four-level test", () => {
    expect(jlptSystemForYear(1984)).toBe(JLPT_SYSTEMS.classic);
    expect(jlptSystemForYear(2009)).toBe(JLPT_SYSTEMS.classic);
  });

  it("treats 2010 onward as the N system", () => {
    expect(jlptSystemForYear(2010)).toBe(JLPT_SYSTEMS.modern);
    expect(jlptSystemForYear(2016)).toBe(JLPT_SYSTEMS.modern);
  });

  it("rejects a year before the test existed", () => {
    expect(jlptSystemForYear(JLPT_FIRST_YEAR - 1)).toBeNull();
    expect(jlptSystemForYear(1970)).toBeNull();
  });
});

describe("levelsForSystem", () => {
  it("offers four levels for the old test and five for the new one", () => {
    expect(levelsForSystem(JLPT_SYSTEMS.classic)).toEqual([1, 2, 3, 4]);
    expect(levelsForSystem(JLPT_SYSTEMS.modern)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("toModernLevel", () => {
  it("maps old Level 4, the beginner certificate, to N5 and not to N4", () => {
    const result = toModernLevel(JLPT_SYSTEMS.classic, 4);
    expect(result?.modernLevel).toBe(5);
    expect(result?.approximate).toBe(true);
  });

  it("maps old Level 3 to N4", () => {
    expect(toModernLevel(JLPT_SYSTEMS.classic, 3)?.modernLevel).toBe(4);
  });

  it("maps old Levels 2 and 1 to N2 and N1", () => {
    expect(toModernLevel(JLPT_SYSTEMS.classic, 2)?.modernLevel).toBe(2);
    expect(toModernLevel(JLPT_SYSTEMS.classic, 1)?.modernLevel).toBe(1);
  });

  it("never maps an old level onto N3, which had no counterpart", () => {
    for (const level of [1, 2, 3, 4]) {
      expect(toModernLevel(JLPT_SYSTEMS.classic, level)?.modernLevel).not.toBe(3);
    }
  });

  it("returns a modern level unchanged and not approximate", () => {
    expect(toModernLevel(JLPT_SYSTEMS.modern, 3)).toEqual({
      modernLevel: 3,
      approximate: false,
      note: "",
    });
  });

  it("rejects a level the system never had", () => {
    expect(toModernLevel(JLPT_SYSTEMS.classic, 5)).toBeNull();
    expect(toModernLevel(JLPT_SYSTEMS.modern, 6)).toBeNull();
  });
});

describe("formatJlptLevel", () => {
  it("writes modern levels as N-numbers", () => {
    expect(formatJlptLevel(JLPT_SYSTEMS.modern, 4)).toBe("N4");
  });

  it("marks old levels so they cannot be misread as N-numbers", () => {
    expect(formatJlptLevel(JLPT_SYSTEMS.classic, 4)).toBe("Level 4 (pre-2010)");
  });
});

describe("level guards", () => {
  it("accepts only the levels each system offered", () => {
    expect(isClassicLevel(4)).toBe(true);
    expect(isClassicLevel(5)).toBe(false);
    expect(isModernLevel(5)).toBe(true);
    expect(isModernLevel(0)).toBe(false);
  });
});

describe("CLASSIC_LEVEL_BENCHMARKS", () => {
  it("gets harder as the level number falls", () => {
    expect(CLASSIC_LEVEL_BENCHMARKS[4].kanji).toBeLessThan(CLASSIC_LEVEL_BENCHMARKS[3].kanji);
    expect(CLASSIC_LEVEL_BENCHMARKS[3].kanji).toBeLessThan(CLASSIC_LEVEL_BENCHMARKS[2].kanji);
    expect(CLASSIC_LEVEL_BENCHMARKS[2].kanji).toBeLessThan(CLASSIC_LEVEL_BENCHMARKS[1].kanji);
  });
});
