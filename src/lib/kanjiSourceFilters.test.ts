import { describe, expect, it } from "vitest";

import {
  KANJI_SOURCES,
  KANJI_SOURCE_DISPLAY,
  KANJI_SOURCE_VALUES,
  matchesSource,
  narrowBySources,
  readSources,
  toggleSource,
  writeSources,
} from "./kanjiSourceFilters";

/*
 * John, on a stroke count holding 226 kanji: "it should probably also have a
 * filter for JLPT Only, WK only, UK only, Grade School Only... useful for
 * someone browsing all kanji and wanting to get rid of things they don't need
 * to recognize/know."
 */
const candidate = (kanji: string, frequencyRank: number | null = null) => ({ kanji, frequencyRank });

describe("which list teaches a character", () => {
  it("knows one the exam, WaniKani and both ladders all teach", () => {
    /* 七 is WK1, UN3, UG3, N5 and the 115th commonest character. */
    const seven = candidate("七", 115);
    for (const source of KANJI_SOURCE_VALUES) expect(matchesSource(seven, source)).toBe(true);
  });

  it("knows one that no list has", () => {
    /* 竃 is on nothing: not jōyō, not JLPT, not WaniKani, unranked. */
    const stove = candidate("竃");
    for (const source of KANJI_SOURCE_VALUES) expect(matchesSource(stove, source)).toBe(false);
  });

  it("keeps the lists separate rather than nesting them", () => {
    /* The lists genuinely differ - the JLPT skips characters our ladder
       carries - so a page must be able to ask them one at a time. */
    const onLadderNotJlpt = KANJI_SOURCE_VALUES.filter((source) =>
      ["丙", "戊"].some((kanji) => matchesSource(candidate(kanji), source)),
    );
    expect(onLadderNotJlpt.length).toBeGreaterThan(0);
  });
});

describe("narrowing a page by them", () => {
  const pool = [candidate("七", 115), candidate("竃"), candidate("鬱")];

  it("keeps only what passes every filter asked for", () => {
    expect(narrowBySources(pool, [KANJI_SOURCES.common]).kept.map((row) => row.kanji)).toEqual(["七"]);
    expect(narrowBySources(pool, []).kept).toHaveLength(3);
  });

  it("counts each chip against what the others left", () => {
    /* The promise the other two filters already make: a chip says what it
       would leave from here, so no number is about a set nobody is looking at. */
    const { counts } = narrowBySources(pool, [KANJI_SOURCES.umakuma]);
    expect(counts[KANJI_SOURCES.umakuma]).toBe(narrowBySources(pool, [KANJI_SOURCES.umakuma]).kept.length);
    expect(counts[KANJI_SOURCES.common]).toBe(
      narrowBySources(pool, [KANJI_SOURCES.umakuma, KANJI_SOURCES.common]).kept.length,
    );
  });

  it("never offers a chip that would empty the page without saying so", () => {
    const { counts } = narrowBySources([candidate("竃")], []);
    for (const source of KANJI_SOURCE_VALUES) expect(counts[source]).toBe(0);
  });
});

describe("the address they live in", () => {
  it("round-trips, in the page's own order", () => {
    const chosen = [KANJI_SOURCES.wanikani, KANJI_SOURCES.common];
    expect(readSources(writeSources(chosen))).toEqual([KANJI_SOURCES.common, KANJI_SOURCES.wanikani]);
  });

  it("ignores anything it does not recognise", () => {
    expect(readSources("wk,nonsense")).toEqual([KANJI_SOURCES.wanikani]);
    expect(readSources(undefined)).toEqual([]);
    expect(readSources("")).toEqual([]);
  });

  it("adds and removes one at a time", () => {
    expect(toggleSource([], KANJI_SOURCES.jlpt)).toEqual([KANJI_SOURCES.jlpt]);
    expect(toggleSource([KANJI_SOURCES.jlpt], KANJI_SOURCES.jlpt)).toEqual([]);
  });
});

describe("what the chips print", () => {
  it("names the ladders the way every chip on the page already does", () => {
    expect(KANJI_SOURCE_DISPLAY[KANJI_SOURCES.wanikani].label).toBe("WK");
    expect(KANJI_SOURCE_DISPLAY[KANJI_SOURCES.umakuma].label).toBe("UN");
    expect(KANJI_SOURCE_DISPLAY[KANJI_SOURCES.umakumaGrade].label).toBe("UG");
  });

  it("gives every filter a word and an explanation", () => {
    for (const source of KANJI_SOURCE_VALUES) {
      expect(KANJI_SOURCE_DISPLAY[source].label.length).toBeGreaterThan(0);
      expect(KANJI_SOURCE_DISPLAY[source].title.length).toBeGreaterThan(10);
    }
  });
});
