import { describe, expect, it } from "vitest";

import { PRACTICE_SOURCES } from "@/lib/practiceSource";

import { STUDY_TAGS } from "@/lib/domainConstants";

import { listPrintHref, listWorksheetHref, parsePracticeTarget, practiceHref } from "./practiceAddress";

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

  /*
   * A saved list is named, not numbered. It used to be reachable only as a
   * picked sheet with every character in the query, which broke on a long list
   * and went stale the moment the list changed.
   */
  it("reads a saved list by its slug", () => {
    expect(parsePracticeTarget(["list", "week-1"])).toEqual({
      source: PRACTICE_SOURCES.list,
      level: null,
      slug: "week-1",
    });
  });

  it("decodes a slug that had to be escaped", () => {
    expect(parsePracticeTarget(["list", encodeURIComponent("漢字-1")])).toEqual({
      source: PRACTICE_SOURCES.list,
      level: null,
      slug: "漢字-1",
    });
  });

  it("refuses a list with no name", () => {
    expect(parsePracticeTarget(["list"])).toBe("invalid");
  });

  /*
   * A list has no level, so the second segment is whose list it is rather
   * than a number - `/practice/list/week-1/2` reads as a member called
   * "week-1". The address parses; the page is what turns an owner nobody
   * answers to into a 404, since only the page can ask.
   */
  it("reads a second segment as an owner, not a level", () => {
    expect(parsePracticeTarget(["list", "week-1", "2"])).toEqual({
      source: PRACTICE_SOURCES.list,
      level: null,
      owner: "week-1",
      slug: "2",
    });
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

  it("addresses a saved list by name, and round-trips it", () => {
    const target = { source: PRACTICE_SOURCES.list, level: null, slug: "week-1" };
    expect(practiceHref("john", target)).toBe("/users/john/practice/list/week-1");
    const path = practiceHref("john", target).split("/practice/")[1]!.split("/");
    expect(parsePracticeTarget(path)).toEqual(target);
  });
});

/*
 * A list somebody else owns is named in the path, not looked up on the
 * reader's own shelf: the sheet is built at the reader's address, so
 * `/practice/list/week-1` has always meant *their* Week 1.
 */
describe("a list belonging to somebody else", () => {
  it("names the owner ahead of the list", () => {
    const target = { source: PRACTICE_SOURCES.list, level: null, owner: "mika", slug: "week-1" };
    expect(practiceHref("john", target)).toBe("/users/john/practice/list/mika/week-1");
  });

  it("reads the owner back off the path", () => {
    expect(parsePracticeTarget(["list", "mika", "week-1"])).toEqual({
      source: PRACTICE_SOURCES.list,
      level: null,
      owner: "mika",
      slug: "week-1",
    });
  });

  it("still reads a bare slug as the reader's own list", () => {
    expect(parsePracticeTarget(["list", "week-1"])).toEqual({
      source: PRACTICE_SOURCES.list,
      level: null,
      slug: "week-1",
    });
  });

  it("refuses a third segment rather than ignoring it", () => {
    expect(parsePracticeTarget(["list", "mika", "week-1", "extra"])).toBe("invalid");
  });

  /* A ladder never grew an owner; two segments there is still nonsense. */
  it("leaves the numbered sources alone", () => {
    expect(parsePracticeTarget(["jlpt", "mika", "5"])).toBe("invalid");
    expect(parsePracticeTarget(["trouble", "mika"])).toBe("invalid");
  });
});

/*
 * One link for a list's worksheet, whichever surface asks. The card used to
 * build a picked sheet carrying every character of the list in the query - it
 * broke on a long list and went stale as soon as the list changed - and the
 * list's own page offered no worksheet at all.
 */
describe("listWorksheetHref", () => {
  const BASE = "/users/john/practice";

  it("offers nothing to a visitor, who has no practice page of their own", () => {
    expect(listWorksheetHref("", { tag: null, name: "Week 1" })).toBeNull();
  });

  it("addresses a saved list by its name", () => {
    expect(listWorksheetHref(BASE, { tag: null, name: "Week 1" })).toBe(
      "/users/john/practice/list/week-1",
    );
  });

  it("addresses a tagged list by its source, which reads the tags", () => {
    expect(listWorksheetHref(BASE, { tag: STUDY_TAGS.trouble, name: "Trouble" })).toBe(
      "/users/john/practice/trouble",
    );
    expect(listWorksheetHref(BASE, { tag: STUDY_TAGS.favorite, name: "Favourites" })).toBe(
      "/users/john/practice/favorite",
    );
  });

  /* Tracing what you have already burned is not practice. */
  it("offers nothing for Burned", () => {
    expect(listWorksheetHref(BASE, { tag: STUDY_TAGS.burned, name: "Burned" })).toBeNull();
  });

  it("names the owner when the list is not the reader's own", () => {
    expect(listWorksheetHref(BASE, { tag: null, name: "Week 1" }, { owner: "mika" })).toBe(
      "/users/john/practice/list/mika/week-1",
    );
  });

  /* An unlisted list is readable only with its key, so the sheet carries it. */
  it("carries the key an unlisted list needs", () => {
    expect(listWorksheetHref(BASE, { tag: null, name: "Week 1" }, { owner: "mika", key: "abc123" })).toBe(
      "/users/john/practice/list/mika/week-1?key=abc123",
    );
  });

  it("joins the print flag to a key rather than starting a second query", () => {
    expect(listPrintHref(BASE, { tag: null, name: "Week 1" }, { owner: "mika", key: "abc123" })).toBe(
      "/users/john/practice/list/mika/week-1?key=abc123&go=1",
    );
  });

  /*
   * Trouble and Favourites are one member's own marks. There is no address at
   * which somebody else's exist, so there is no sheet to offer.
   */
  it("offers nothing for somebody else's tagged list", () => {
    expect(listWorksheetHref(BASE, { tag: STUDY_TAGS.trouble, name: "Trouble" }, { owner: "mika" })).toBeNull();
  });

  it("offers nothing for a name that makes no address", () => {
    expect(listWorksheetHref(BASE, { tag: null, name: "!!!" })).toBeNull();
  });

  it("asks the print dialog to open on arrival, and only there", () => {
    expect(listPrintHref(BASE, { tag: null, name: "Week 1" })).toBe(
      "/users/john/practice/list/week-1?go=1",
    );
    expect(listWorksheetHref(BASE, { tag: null, name: "Week 1" })).not.toContain("go=1");
    expect(listPrintHref(BASE, { tag: STUDY_TAGS.burned, name: "Burned" })).toBeNull();
  });
});
