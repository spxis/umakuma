import { describe, expect, it } from "vitest";

import { PRACTICE_SOURCES } from "@/lib/practiceSource";

import { parsePracticeTarget, practiceHref } from "./practiceAddress";

describe("parsePracticeTarget", () => {
  it("treats a bare /practice as choosing what to practise", () => {
    expect(parsePracticeTarget([])).toBeNull();
    expect(parsePracticeTarget(undefined)).toBeNull();
  });

  it("reads a ladder and the level within it", () => {
    expect(parsePracticeTarget(["grade", "2"])).toEqual({ source: PRACTICE_SOURCES.grade, level: 2 });
    expect(parsePracticeTarget(["jlpt", "5"])).toEqual({ source: PRACTICE_SOURCES.jlpt, level: 5 });
    expect(parsePracticeTarget(["wanikani", "12"])).toEqual({
      source: PRACTICE_SOURCES.wanikani,
      level: 12,
    });
  });

  /* A list is the whole set, so a level on one would mean nothing. */
  it("reads a list with no level", () => {
    expect(parsePracticeTarget(["trouble"])).toEqual({ source: PRACTICE_SOURCES.trouble, level: null });
    expect(parsePracticeTarget(["favorite"])).toEqual({ source: PRACTICE_SOURCES.favorite, level: null });
  });

  it("refuses a level on a list", () => {
    expect(parsePracticeTarget(["trouble", "3"])).toBe("invalid");
  });

  it("refuses a ladder with no level, rather than guessing one", () => {
    expect(parsePracticeTarget(["grade"])).toBe("invalid");
    expect(parsePracticeTarget(["jlpt"])).toBe("invalid");
  });

  it("refuses a source it does not have and a level that is not one", () => {
    expect(parsePracticeTarget(["heisig", "1"])).toBe("invalid");
    expect(parsePracticeTarget(["grade", "nonsense"])).toBe("invalid");
    expect(parsePracticeTarget(["grade", "0"])).toBe("invalid");
    expect(parsePracticeTarget(["grade", "2", "extra"])).toBe("invalid");
  });
});

describe("practiceHref", () => {
  it("addresses the chooser when nothing is chosen yet", () => {
    expect(practiceHref("john")).toBe("/users/john/practice");
  });

  it("puts the collection in the path", () => {
    expect(practiceHref("john", { source: PRACTICE_SOURCES.jlpt, level: 5 })).toBe(
      "/users/john/practice/jlpt/5",
    );
    expect(practiceHref("john", { source: PRACTICE_SOURCES.trouble, level: null })).toBe(
      "/users/john/practice/trouble",
    );
  });

  it("escapes a name that needs it", () => {
    expect(practiceHref("a b", { source: PRACTICE_SOURCES.grade, level: 1 })).toBe(
      "/users/a%20b/practice/grade/1",
    );
  });

  it("round-trips with the parser", () => {
    const target = { source: PRACTICE_SOURCES.wanikani, level: 30 };
    const path = practiceHref("john", target).split("/practice/")[1]!.split("/");
    expect(parsePracticeTarget(path)).toEqual(target);
  });
});
