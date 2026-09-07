import { describe, expect, it } from "vitest";

import { readParts } from "./radicalBrowser";

import { KANJI_SOURCES, readSources } from "./kanjiSourceFilters";
import { readPage, strokesFromPath, strokesHref, strokesIndexHref } from "./strokeAddress";
import { kanjiByStrokeCount, strokeCounts, strokesPageHref } from "./strokeBrowser";

describe("the stroke browser's address", () => {
  it("makes a stroke count a page of its own", () => {
    expect(strokesHref(null)).toBe("/strokes");
    expect(strokesHref(12)).toBe("/strokes/12");
  });

  /* What the page is goes in the path; what is on it goes in the query. */
  it("keeps the view's own state out of the path", () => {
    expect(strokesHref(12, { sources: [KANJI_SOURCES.common] })).toBe("/strokes/12?sources=common");
    expect(strokesHref(12, { page: 2 })).toBe("/strokes/12?page=2");
    expect(strokesHref(12, { sources: [KANJI_SOURCES.common], page: 3 })).toBe("/strokes/12?sources=common&page=3");
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
    expect(readSources("common,wk")).toEqual([KANJI_SOURCES.common, KANJI_SOURCES.wanikani]);
    expect(readSources(undefined)).toEqual([]);
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

/*
 * "the 17-stroke kanji with a mouth in them" is an answer somebody wants to
 * send to somebody else, so the parts are in the address and not in a hook.
 */
describe("the parts a stroke page has been narrowed to", () => {
  it("carries them the way /radicals spells them", () => {
    expect(strokesHref(17, { parts: ["口"] })).toBe("/strokes/17?parts=%E5%8F%A3");
    expect(strokesHref(17, { parts: ["口", "土"] })).toBe("/strokes/17?parts=%E5%8F%A3%E5%9C%9F");
  });

  it("leaves them out when nothing is picked", () => {
    expect(strokesHref(17, { parts: [] })).toBe("/strokes/17");
    expect(strokesHref(17)).toBe("/strokes/17");
  });

  it("keeps them beside the other two", () => {
    expect(strokesHref(17, { sources: [KANJI_SOURCES.common], parts: ["口"], page: 2 })).toBe(
      "/strokes/17?sources=common&parts=%E5%8F%A3&page=2",
    );
  });

  it("reads back what it wrote, through the radicals page's own reader", () => {
    expect(readParts("口土")).toEqual(["口", "土"]);
  });
});

/*
 * John, on 竃's stroke panel: "there's no link from the Kanji Stroke order
 * container to the Kanji in the Strokes page. There should be a relationship
 * that takes you right to it, the 17 strokes page."
 */
describe("out to the rest of a stroke count", () => {
  it("leads to the page for that count", () => {
    expect(strokesPageHref(17)).toBe("/strokes/17");
  });

  it("offers nothing where there is nothing on the other end", () => {
    /* No kanji we teach takes 40 strokes, so the page would be a 404. */
    expect(strokesPageHref(40)).toBeNull();
    expect(strokesPageHref(null)).toBeNull();
    expect(strokesPageHref(undefined)).toBeNull();
  });

  it("offers a link for every count the browser itself lists", () => {
    for (const entry of strokeCounts()) expect(strokesPageHref(entry.strokes)).toBe(`/strokes/${entry.strokes}`);
  });

  /* No parts pre-picked, on John's reason: "people are more interested in
     other 17 stroke items." */
  it("carries no parts, so it opens on the whole count", () => {
    expect(strokesPageHref(17)).not.toContain("parts");
  });
});
