import { describe, expect, it } from "vitest";

import {
  RECENT_SEARCH_MEMORY,
  RECENT_SEARCH_VISIBLE,
  addRecentSearch,
  removeRecentSearch,
} from "./recentSearches";

describe("addRecentSearch", () => {
  it("puts the newest search first", () => {
    expect(addRecentSearch(["house"], "water")).toEqual(["water", "house"]);
  });

  it("moves a repeated search back to the top instead of listing it twice", () => {
    expect(addRecentSearch(["water", "house", "sun"], "house")).toEqual(["house", "water", "sun"]);
  });

  it("treats a difference of case as the same search", () => {
    expect(addRecentSearch(["House"], "house")).toEqual(["house"]);
  });

  it("trims, and ignores a search that is only whitespace", () => {
    expect(addRecentSearch([], "  house  ")).toEqual(["house"]);
    expect(addRecentSearch(["house"], "   ")).toEqual(["house"]);
    expect(addRecentSearch(["house"], "")).toEqual(["house"]);
  });

  it("remembers more than it shows, and stops at the cap", () => {
    expect(RECENT_SEARCH_MEMORY).toBeGreaterThan(RECENT_SEARCH_VISIBLE);

    let list: string[] = [];
    for (let index = 0; index < RECENT_SEARCH_MEMORY + 5; index += 1) {
      list = addRecentSearch(list, `query-${index}`);
    }

    expect(list).toHaveLength(RECENT_SEARCH_MEMORY);
    expect(list[0]).toBe(`query-${RECENT_SEARCH_MEMORY + 4}`);
  });
});

describe("removeRecentSearch", () => {
  it("forgets one search and keeps the rest in order", () => {
    expect(removeRecentSearch(["water", "house", "sun"], "house")).toEqual(["water", "sun"]);
  });

  it("still fills the visible rows, because the extras were remembered", () => {
    const remembered = Array.from({ length: RECENT_SEARCH_MEMORY }, (_, index) => `query-${index}`);
    const afterForgetting = removeRecentSearch(remembered, "query-2");

    expect(afterForgetting.slice(0, RECENT_SEARCH_VISIBLE)).toHaveLength(RECENT_SEARCH_VISIBLE);
    expect(afterForgetting).not.toContain("query-2");
  });

  it("leaves the list alone when the search is not in it", () => {
    expect(removeRecentSearch(["water"], "house")).toEqual(["water"]);
  });
});
