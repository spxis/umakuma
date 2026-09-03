import { describe, expect, it } from "vitest";

import {
  groupsForStrokes,
  radicalStrokeCounts,
  radicalsHref,
  radicalsShown,
  readParts,
  readStrokes,
  togglePart,
} from "./radicalBrowser";
import type { RadicalGroup } from "./radicalSearch";

const GROUPS: RadicalGroup[] = [
  { strokes: 3, radicals: ["女", "子", "小"] },
  { strokes: 1, radicals: ["一", "｜"] },
  { strokes: 4, radicals: ["水"] },
];

describe("the stroke counts along the top", () => {
  it("counts the radicals at each, in order", () => {
    expect(radicalStrokeCounts(GROUPS)).toEqual([
      { strokes: 1, count: 2 },
      { strokes: 3, count: 3 },
      { strokes: 4, count: 1 },
    ]);
  });
});

describe("which groups the page shows", () => {
  /*
   * All of them by default. There are 253 radicals in total, so the whole set
   * fits on a screen and somebody arriving with no question in mind should
   * see the radicals rather than a prompt asking them to choose first.
   */
  it("shows every group when no count is asked for, in stroke order", () => {
    expect(groupsForStrokes(GROUPS, null).map((group) => group.strokes)).toEqual([1, 3, 4]);
  });

  it("shows one group when a count is asked for", () => {
    expect(groupsForStrokes(GROUPS, 3)).toEqual([{ strokes: 3, radicals: ["女", "子", "小"] }]);
  });

  it("does not disturb what it was given", () => {
    groupsForStrokes(GROUPS, null);
    expect(GROUPS.map((group) => group.strokes)).toEqual([3, 1, 4]);
  });

  it("counts what is on the page", () => {
    expect(radicalsShown(GROUPS)).toBe(6);
  });
});

describe("the page's address", () => {
  it("is plain when nothing is narrowed", () => {
    expect(radicalsHref()).toBe("/radicals");
    expect(radicalsHref({ strokes: null, parts: [] })).toBe("/radicals");
  });

  it("carries the stroke filter and the picked radicals", () => {
    expect(radicalsHref({ strokes: 3 })).toBe("/radicals?strokes=3");
    expect(radicalsHref({ parts: ["水", "田"] })).toBe(`/radicals?parts=${encodeURIComponent("水田")}`);
    expect(radicalsHref({ strokes: 3, parts: ["女"] })).toBe(`/radicals?strokes=3&parts=${encodeURIComponent("女")}`);
  });

  it("reads back what it wrote", () => {
    expect(readStrokes("3", [1, 3, 4])).toBe(3);
    expect(readParts("水田")).toEqual(["水", "田"]);
  });

  /* A count nobody has radicals for is not a filter, it is an empty page. */
  it("ignores a stroke count no radical has", () => {
    expect(readStrokes("99", [1, 3, 4])).toBeNull();
    expect(readStrokes("banana", [1, 3, 4])).toBeNull();
    expect(readStrokes(undefined, [1, 3, 4])).toBeNull();
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
