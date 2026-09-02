import { describe, expect, it } from "vitest";

import { defaultJlptLevels, readJlptFilterAddress, writeJlptFilterAddress, type JlptFilterState } from "./jlptExplorerAddress";

const opened: JlptFilterState = {
  levels: defaultJlptLevels(),
  stickyLevels: false,
  wkFilter: "all",
  wkLevelFilter: null,
  gradeFilter: null,
};

describe("the JLPT explorer's filters in its address", () => {
  /* The bug: choosing N5 changed nothing about the URL. */
  it("puts a chosen level in the address", () => {
    const params = new URLSearchParams("q=水");
    writeJlptFilterAddress(params, { ...opened, levels: new Set([5]) });
    expect(params.get("n")).toBe("5");
    /* And leaves the search where it was. */
    expect(params.get("q")).toBe("水");
  });

  it("says nothing about a filter left at its default, so a plain link stays plain", () => {
    const params = new URLSearchParams();
    writeJlptFilterAddress(params, opened);
    expect(params.toString()).toBe("");
  });

  it("reads back what it wrote", () => {
    const state: JlptFilterState = {
      levels: new Set([4, 5]),
      stickyLevels: true,
      wkFilter: "kanji",
      wkLevelFilter: 12,
      gradeFilter: "none",
    };
    const params = new URLSearchParams();
    writeJlptFilterAddress(params, state);
    const read = readJlptFilterAddress(params);
    expect(read.levels).toEqual(new Set([4, 5]));
    expect(read.stickyLevels).toBe(true);
    expect(read.wkFilter).toBe("kanji");
    expect(read.wkLevelFilter).toBe(12);
    expect(read.gradeFilter).toBe("none");
  });

  it("leaves a filter the address does not mention to the browser's memory", () => {
    const read = readJlptFilterAddress(new URLSearchParams("n=3"));
    expect(read.levels).toEqual(new Set([3]));
    expect(read.wkFilter).toBeUndefined();
    expect(read.gradeFilter).toBeUndefined();
  });

  it("ignores a level or filter that does not exist", () => {
    const read = readJlptFilterAddress(new URLSearchParams("n=9,2&wk=maybe&grade=zero"));
    expect(read.levels).toEqual(new Set([2]));
    expect(read.wkFilter).toBeUndefined();
    expect(read.gradeFilter).toBeUndefined();
  });

  it("clears a filter from the address when it goes back to its default", () => {
    const params = new URLSearchParams("n=5&wk=none&grade=2");
    writeJlptFilterAddress(params, opened);
    expect(params.toString()).toBe("");
  });
});
