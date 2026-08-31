import { describe, expect, it } from "vitest";

import {
  isMissingStudyListTableError,
  normalizeListCharacters,
  STUDY_LIST_LIMITS,
} from "./studyLists";

/**
 * What actually reaches the database when somebody saves a list.
 *
 * The client sends the same encoded string the selection carries, so this is
 * the boundary where a stray space, a duplicate or a runaway paste becomes a
 * row - and where a character outside the Basic Multilingual Plane gets torn
 * in half if the splitting is naive.
 */

describe("normalizing a saved list", () => {
  it("splits an encoded selection into characters", () => {
    expect(normalizeListCharacters(["一右雨"])).toEqual(["一", "右", "雨"]);
  });

  it("keeps the order the member chose", () => {
    expect(normalizeListCharacters(["王一雨"])).toEqual(["王", "一", "雨"]);
  });

  it("keeps a character that is two UTF-16 units whole", () => {
    // 𠮟 is jōyō and outside the BMP; split on "" it becomes two broken halves.
    const normalized = normalizeListCharacters(["𠮟雨"]);
    expect(normalized).toEqual(["𠮟", "雨"]);
    expect(normalized[0]).toHaveLength(2);
  });

  it("drops duplicates and whitespace", () => {
    expect(normalizeListCharacters(["一 一\n雨"])).toEqual(["一", "雨"]);
  });

  it("caps a runaway paste rather than storing it", () => {
    const many = Array.from({ length: STUDY_LIST_LIMITS.characters + 40 }, (_, i) =>
      String.fromCodePoint(0x4e00 + i),
    ).join("");
    expect(normalizeListCharacters([many])).toHaveLength(STUDY_LIST_LIMITS.characters);
  });

  it("returns nothing for nothing", () => {
    expect(normalizeListCharacters([])).toEqual([]);
    expect(normalizeListCharacters(["   "])).toEqual([]);
  });
});

describe("a table that is not there yet", () => {
  /*
   * This repo applies schema by hand, so code can reach production a moment
   * before its table does. Recognising that case is what lets the lists page
   * show "none yet" instead of a 500.
   */
  it("recognises the Prisma codes for a missing table or column", () => {
    expect(isMissingStudyListTableError({ code: "P2021" })).toBe(true);
    expect(isMissingStudyListTableError({ code: "P2022" })).toBe(true);
  });

  it("does not swallow anything else", () => {
    expect(isMissingStudyListTableError({ code: "P2002" })).toBe(false);
    expect(isMissingStudyListTableError(new Error("boom"))).toBe(false);
    expect(isMissingStudyListTableError(null)).toBe(false);
  });
});
