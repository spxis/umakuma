import { describe, expect, it } from "vitest";

import {
  isDuplicateListNameError,
  isReservedListSlug,
  isMissingStudyListTableError,
  normalizeListCharacters,
  normalizeListName,
  STUDY_LIST_LIMITS,
} from "./studyListRules";

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

/**
 * What a list ends up called.
 *
 * The name is half of the unique key, so tidying it is not cosmetic: two names
 * that differ only in whitespace would be two rows a member cannot tell apart
 * on the page, and saving under one of them would update the wrong list.
 */
describe("normalizing a list name", () => {
  it("trims the ends", () => {
    expect(normalizeListName("  Week 1  ")).toBe("Week 1");
  });

  it("collapses whitespace inside, so one name is one list", () => {
    expect(normalizeListName("Week   1")).toBe("Week 1");
    expect(normalizeListName("Week\n1")).toBe("Week 1");
    expect(normalizeListName("Week\t1")).toBe("Week 1");
  });

  it("caps a long name at the stored length", () => {
    const long = "あ".repeat(STUDY_LIST_LIMITS.nameLength + 20);
    expect(Array.from(normalizeListName(long) ?? "")).toHaveLength(STUDY_LIST_LIMITS.nameLength);
  });

  it("counts characters, not UTF-16 units, when capping", () => {
    // 𠮟 is two units each; slicing the string would cut one in half.
    const long = "𠮟".repeat(STUDY_LIST_LIMITS.nameLength + 5);
    const capped = normalizeListName(long) ?? "";
    expect(Array.from(capped)).toHaveLength(STUDY_LIST_LIMITS.nameLength);
    expect(capped.endsWith("𠮟")).toBe(true);
  });

  it("refuses a name that is only whitespace", () => {
    expect(normalizeListName("   ")).toBeNull();
    expect(normalizeListName("\n\t")).toBeNull();
    expect(normalizeListName("")).toBeNull();
  });

  /*
   * The same function on both routes, so renaming to "Week  1" lands on the
   * existing "Week 1" as a duplicate rather than creating a second one.
   */
  it("is stable, so saving and renaming agree", () => {
    const once = normalizeListName("  Week   1 ");
    expect(normalizeListName(once ?? "")).toBe(once);
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

/*
 * Renaming onto a name that exists has no sensible merge - the two lists hold
 * different characters - so the constraint has to reach the member as
 * something they can act on rather than as a 500.
 */
describe("a name that is already taken", () => {
  it("recognises the unique violation", () => {
    expect(isDuplicateListNameError({ code: "P2002" })).toBe(true);
  });

  it("does not claim every failure is a duplicate", () => {
    expect(isDuplicateListNameError({ code: "P2021" })).toBe(false);
    expect(isDuplicateListNameError(new Error("boom"))).toBe(false);
    expect(isDuplicateListNameError(null)).toBe(false);
  });
});

describe("addresses that belong to a page rather than a list", () => {
  /*
   * Next serves a static segment ahead of `[slug]`, so a list named "Archived"
   * would sit at an address the archived page owns and could never be opened.
   */
  it("refuses the names the section pages use", () => {
    expect(isReservedListSlug("Auto")).toBe(true);
    expect(isReservedListSlug("following")).toBe(true);
    expect(isReservedListSlug("Archived")).toBe(true);
  });

  it("catches a name that only becomes reserved once it is an address", () => {
    expect(isReservedListSlug("  archived  ")).toBe(true);
    expect(isReservedListSlug("Auto!")).toBe(true);
  });

  it("leaves ordinary names alone", () => {
    expect(isReservedListSlug("Week 1")).toBe(false);
    expect(isReservedListSlug("Autobiography")).toBe(false);
    expect(isReservedListSlug("Archived words")).toBe(false);
  });
});
