import { describe, expect, it } from "vitest";

import { burnedCandidates, withoutBurned } from "./burnList";

describe("what WaniKani would put on the burned list", () => {
  it("is every subject at the burned stage, once each", () => {
    const ids = burnedCandidates([
      { subjectId: 1, srsStage: 9 },
      { subjectId: 2, srsStage: 8 },
      { subjectId: 1, srsStage: 9 },
      { subjectId: 3, srsStage: 9 },
    ]);
    expect(ids).toEqual([1, 3]);
  });
});

describe("applying the burned list to what is being read", () => {
  const rows = [
    { subjectId: 1, glyph: "日" },
    { subjectId: 2, glyph: "月" },
    { subjectId: null, glyph: "渕" },
  ];

  it("takes the burned rows out and says how many went", () => {
    const { kept, hidden } = withoutBurned(rows, new Set([1]));
    expect(kept.map((row) => row.glyph)).toEqual(["月", "渕"]);
    expect(hidden).toBe(1);
  });

  /* A kanji WaniKani never taught cannot be burned there, so it always stays. */
  it("leaves rows the catalogue does not name alone", () => {
    expect(withoutBurned(rows, new Set([1, 2])).kept.map((row) => row.glyph)).toEqual(["渕"]);
  });

  it("changes nothing when nothing is burned", () => {
    expect(withoutBurned(rows, new Set())).toEqual({ kept: rows, hidden: 0 });
  });
});
