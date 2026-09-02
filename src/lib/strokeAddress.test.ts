import { describe, expect, it } from "vitest";

import { readCommonOnly, readPage, strokesFromPath, strokesHref } from "./strokeAddress";

describe("the stroke browser's address", () => {
  it("makes a stroke count a page of its own", () => {
    expect(strokesHref(null)).toBe("/strokes");
    expect(strokesHref(12)).toBe("/strokes/12");
  });

  /* What the page is goes in the path; what is on it goes in the query. */
  it("keeps the view's own state out of the path", () => {
    expect(strokesHref(12, { commonOnly: true })).toBe("/strokes/12?common=1");
    expect(strokesHref(12, { page: 2 })).toBe("/strokes/12?page=2");
    expect(strokesHref(12, { commonOnly: true, page: 3 })).toBe("/strokes/12?common=1&page=3");
    expect(strokesHref(12, { page: 1 })).toBe("/strokes/12");
  });

  it("reads a count back, and refuses what is not one", () => {
    expect(strokesFromPath([])).toBeNull();
    expect(strokesFromPath(undefined)).toBeNull();
    expect(strokesFromPath(["12"])).toBe(12);
    expect(strokesFromPath(["0"])).toBeUndefined();
    expect(strokesFromPath(["twelve"])).toBeUndefined();
    expect(strokesFromPath(["12", "more"])).toBeUndefined();
  });

  it("reads what the query says about the page", () => {
    expect(readCommonOnly("1")).toBe(true);
    expect(readCommonOnly(undefined)).toBe(false);
    expect(readPage("3")).toBe(3);
    expect(readPage("nonsense")).toBe(1);
  });
});
