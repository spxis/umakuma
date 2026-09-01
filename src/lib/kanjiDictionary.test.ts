import { describe, expect, it } from "vitest";

import {
  clearKanjiDictionaryCache,
  getAllKanjiDictionaryEntries,
  getKanjiDictionaryAttribution,
  getKanjiDictionaryEntry,
} from "./kanjiDictionary";

describe("kanji dictionary attribution", () => {
  /*
   * KANJIDIC2 is CC BY-SA: the credit is a licence condition, not decoration,
   * so it is asserted rather than assumed - the same guard the stroke data has.
   */
  it("names the source, the publisher and the licence", () => {
    const attribution = getKanjiDictionaryAttribution();
    expect(attribution?.source).toBe("KANJIDIC2");
    expect(attribution?.publisher).toContain("Electronic Dictionary Research");
    expect(attribution?.licence).toContain("CC BY-SA");
    expect(attribution?.url).toContain("edrdg.org");
  });

  it("records which release it was built from, so a rebuild is traceable", () => {
    expect(getKanjiDictionaryAttribution()?.databaseVersion).toMatch(/^\d{4}-\d+$/);
  });
});

describe("getKanjiDictionaryEntry", () => {
  it("reads every meaning, not just the first", () => {
    const entry = getKanjiDictionaryEntry("王");
    expect(entry?.meanings).toContain("king");
    /* The meaning that returned nothing before the ranking fix. */
    expect(entry?.meanings).toContain("magnate");
    expect(entry?.primaryMeaning).toBe("king");
  });

  it("carries readings, including the ones only names use", () => {
    const entry = getKanjiDictionaryEntry("王");
    expect(entry?.readings.on).toContain("オウ");
    expect(entry?.readings.nanori).toContain("おおきみ");
  });

  it("holds the characters our own tables are missing", () => {
    /* Neither is in the JLPT table at all; both are ordinary Japanese. */
    expect(getKanjiDictionaryEntry("鬱")?.primaryMeaning).toBe("gloom");
    expect(getKanjiDictionaryEntry("苺")?.primaryMeaning).toBe("strawberry");
  });

  it("carries the numbers a reader is shown", () => {
    const entry = getKanjiDictionaryEntry("水");
    expect(entry?.grade).toBe(1);
    expect(entry?.strokeCount).toBe(4);
    expect(entry?.frequencyRank).toBeGreaterThan(0);
  });

  /*
   * `Number(null)` is 0, so reading an absent grade carelessly grades every
   * ungraded character - which silently dropped 7,410 of them from the build
   * until the bucketing refused to lose entries. Grade zero does not exist.
   */
  it("leaves an absent grade absent rather than calling it grade zero", () => {
    const entries = getAllKanjiDictionaryEntries();
    expect(entries.filter((entry) => entry.grade === 0)).toEqual([]);
    expect(entries.some((entry) => entry.grade === null)).toBe(true);
    expect(entries.some((entry) => entry.frequencyRank === 0)).toBe(false);
  });

  it("returns nothing for what it does not hold", () => {
    expect(getKanjiDictionaryEntry("A")).toBeNull();
    expect(getKanjiDictionaryEntry("")).toBeNull();
  });

  it("answers the same after its cache is dropped", () => {
    const before = getKanjiDictionaryEntry("水");
    clearKanjiDictionaryCache();
    expect(getKanjiDictionaryEntry("水")).toEqual(before);
  });
});

describe("getAllKanjiDictionaryEntries", () => {
  it("accounts for every character the index claims", () => {
    const entries = getAllKanjiDictionaryEntries();
    expect(entries.length).toBeGreaterThan(10_000);

    const index = getKanjiDictionaryAttribution();
    expect(index).not.toBeNull();
    expect(new Set(entries.map((entry) => entry.kanji)).size).toBe(entries.length);
  });

  it("gives every entry a meaning to show", () => {
    const empty = getAllKanjiDictionaryEntries().filter((entry) => !entry.primaryMeaning);
    expect(empty).toEqual([]);
  });
});
