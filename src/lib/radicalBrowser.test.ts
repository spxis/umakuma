import { describe, expect, it } from "vitest";

import {
  orderedGroups,
  radicalStrokeCounts,
  radicalsHref,
  radicalsShown,
  readParts,
  togglePart,
} from "./radicalBrowser";
import type { RadicalGroup } from "./radicalSearch";

const GROUPS: RadicalGroup[] = [
  { strokes: 3, radicals: ["女", "子", "小"] },
  { strokes: 1, radicals: ["一", "｜"] },
  { strokes: 4, radicals: ["水"] },
];

describe("what the page shows", () => {
  /*
   * All of them, always. A first version filtered by stroke count the way the
   * stroke browser does, which is exactly wrong here: 900 kanji at one count
   * have to be narrowed to be readable, while 253 radicals are a set you scan.
   * Choosing "3 strokes" hid the 208 radicals somebody was looking through to
   * find the one they wanted.
   */
  it("orders every group by stroke count and drops none", () => {
    const ordered = orderedGroups(GROUPS);
    expect(ordered.map((group) => group.strokes)).toEqual([1, 3, 4]);
    expect(radicalsShown(ordered)).toBe(6);
  });

  it("does not disturb what it was given", () => {
    orderedGroups(GROUPS);
    expect(GROUPS.map((group) => group.strokes)).toEqual([3, 1, 4]);
  });

  /* The counts still label the rows, so they are still worth computing. */
  it("counts the radicals at each stroke count", () => {
    expect(radicalStrokeCounts(GROUPS)).toEqual([
      { strokes: 1, count: 2 },
      { strokes: 3, count: 3 },
      { strokes: 4, count: 1 },
    ]);
  });
});

describe("the page's address", () => {
  it("is plain when nothing is picked", () => {
    expect(radicalsHref()).toBe("/radicals");
    expect(radicalsHref({ parts: [] })).toBe("/radicals");
  });

  it("carries the picked radicals, and reads them back", () => {
    expect(radicalsHref({ parts: ["水", "田"] })).toBe(`/radicals?parts=${encodeURIComponent("水田")}`);
    expect(readParts("水田")).toEqual(["水", "田"]);
  });

  it("reads each radical once, however often the address repeats it", () => {
    expect(readParts("水水田")).toEqual(["水", "田"]);
    expect(readParts(undefined)).toEqual([]);
  });
});

describe("picking a radical", () => {
  it("adds one that is not picked and removes one that is", () => {
    expect(togglePart(["水"], "田")).toEqual(["水", "田"]);
    expect(togglePart(["水", "田"], "水")).toEqual(["田"]);
  });
});
