import { describe, expect, it } from "vitest";

import { readCommonOnly, readPage, strokesFromPath, strokesHref, strokesIndexHref } from "./strokeAddress";
import { kanjiByStrokeCount, strokeCounts } from "./strokeBrowser";

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

/*
 * The index used to render a panel saying "pick a stroke count above", which
 * is a page whose content is an instruction to use the page. It opens on a
 * real count now, and the address bar says which.
 */
describe("where the index opens", () => {
  it("goes to the first count the data has", () => {
    expect(strokesIndexHref([{ strokes: 1 }, { strokes: 2 }])).toBe("/strokes/1");
    expect(strokesIndexHref([{ strokes: 3 }, { strokes: 4 }])).toBe("/strokes/3");
  });

  /* The real counts, so the redirect cannot land on a page that 404s. */
  it("lands on a count the browser actually lists", () => {
    const counts = strokeCounts();
    expect(counts.length).toBeGreaterThan(0);
    expect(strokesIndexHref(counts)).toBe(`/strokes/${counts[0]!.strokes}`);
    expect(kanjiByStrokeCount(counts[0]!.strokes).length).toBeGreaterThan(0);
  });

  /* Nothing to open on is the index itself, rather than a broken address. */
  it("stays put when there are no counts at all", () => {
    expect(strokesIndexHref([])).toBe("/strokes");
  });
});
