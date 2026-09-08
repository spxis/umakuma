import { describe, expect, it } from "vitest";

import { DEAD_ENDS, visibleGroups } from "./RadicalPartsGrid";

/*
 * John, on the stroke pages: "there is no point showing the disabled radicals
 * that can never be clicked for that stroke count - it's just clutter, it
 * increases height and pushes content down." /radicals keeps every tile in
 * place, dimmed, because there the grid is the index itself.
 */
const groups = [
  { strokes: 1, radicals: ["一", "丨"] },
  { strokes: 2, radicals: ["人", "儿", "入"] },
  { strokes: 3, radicals: ["口", "土"] },
];

describe("what the radical grid draws", () => {
  it("draws everything when dead ends are dimmed, whatever is usable", () => {
    expect(visibleGroups(groups, [], new Set(["口"]), DEAD_ENDS.dimmed)).toEqual(groups);
  });

  it("drops dead ends when they are hidden, and a stroke count left with none", () => {
    expect(visibleGroups(groups, [], new Set(["丨", "口", "土"]), DEAD_ENDS.hidden)).toEqual([
      { strokes: 1, radicals: ["丨"] },
      { strokes: 3, radicals: ["口", "土"] },
    ]);
  });

  it("always keeps a chosen radical on screen, so it can be un-chosen", () => {
    expect(visibleGroups(groups, ["人"], new Set(["口"]), DEAD_ENDS.hidden)).toEqual([
      { strokes: 2, radicals: ["人"] },
      { strokes: 3, radicals: ["口"] },
    ]);
  });
});
