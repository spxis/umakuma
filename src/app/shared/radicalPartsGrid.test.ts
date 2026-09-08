import { describe, expect, it } from "vitest";

import { visibleGroups } from "./RadicalPartsGrid";

/*
 * John, on the stroke pages: "there is no point showing the disabled radicals
 * that can never be clicked for that stroke count" - and, when the first cut
 * removed tiles on every pick, "just remove the unused radicals from the top
 * level, not for each click - otherwise the radicals menu moves each click".
 * So the set a page draws is fixed by the page, and a pick only dims.
 */
const groups = [
  { strokes: 1, radicals: ["一", "丨"] },
  { strokes: 2, radicals: ["人", "儿", "入"] },
  { strokes: 3, radicals: ["口", "土"] },
];

describe("what the radical grid draws", () => {
  it("draws every radical when the page has no fixed set", () => {
    expect(visibleGroups(groups, [], null)).toEqual(groups);
  });

  it("draws only the page's fixed set, and drops a stroke count left with none", () => {
    expect(visibleGroups(groups, [], new Set(["丨", "口", "土"]))).toEqual([
      { strokes: 1, radicals: ["丨"] },
      { strokes: 3, radicals: ["口", "土"] },
    ]);
  });

  it("does not move when a pick changes what can still narrow", () => {
    const fixed = new Set(["丨", "口", "土"]);
    expect(visibleGroups(groups, ["口"], fixed)).toEqual(visibleGroups(groups, [], fixed));
  });

  it("always keeps a chosen radical on screen, so it can be un-chosen", () => {
    expect(visibleGroups(groups, ["人"], new Set(["口"]))).toEqual([
      { strokes: 2, radicals: ["人"] },
      { strokes: 3, radicals: ["口"] },
    ]);
  });
});
