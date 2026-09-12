import { describe, expect, it } from "vitest";

import {
  MAP_SET_LIMITS,
  entriesInMapSet,
  mapSetLabel,
  mapSetProblems,
  normalizeMapSetRegions,
  toMapCustomSetSummary,
} from "./mapCustomSets";

const KNOWN = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

describe("a usable set", () => {
  it("has a name and at least two regions the map draws", () => {
    expect(mapSetProblems({ country: "JP", name: "Kanto", regions: [8, 9, 10, 11, 12, 13] }, KNOWN)).toEqual([]);
  });

  it("refuses no name, a name past the column, one region, and a code off the map", () => {
    expect(mapSetProblems({ country: "JP", name: "  ", regions: [1, 2] }, KNOWN)).toEqual(["Give the set a name."]);
    expect(mapSetProblems({ country: "JP", name: "x".repeat(MAP_SET_LIMITS.name + 1), regions: [1, 2] }, KNOWN)).toHaveLength(1);
    expect(mapSetProblems({ country: "JP", name: "One", regions: [1] }, KNOWN)).toEqual(["Choose at least 2 to play with."]);
    expect(mapSetProblems({ country: "JP", name: "Off", regions: [1, 99] }, KNOWN)).toEqual(["Not on this map: 99."]);
  });

  it("counts a region once however many times it was tapped", () => {
    expect(normalizeMapSetRegions([3, "3", " 3 ", 4, ""])).toEqual(["3", "4"]);
    expect(mapSetProblems({ country: "JP", name: "Twice", regions: [3, 3] }, KNOWN)).toEqual(["Choose at least 2 to play with."]);
  });
});

describe("the pool a set makes", () => {
  const entries = [{ code: 1, name: "Hokkaido" }, { code: 2, name: "Aomori" }, { code: 3, name: "Iwate" }];

  it("keeps the pool's own order and drops what the set does not name", () => {
    expect(entriesInMapSet(entries, ["3", "1"]).map((entry) => entry.name)).toEqual(["Hokkaido", "Iwate"]);
    expect(entriesInMapSet(entries, ["TX"])).toEqual([]);
  });

  it("labels a set with its size, and dates a row as a string", () => {
    expect(mapSetLabel({ name: "Tohoku", regions: ["2", "3"] })).toBe("Tohoku · 2");
    const summary = toMapCustomSetSummary({ id: "s1", country: "JP", name: "Tohoku", regions: ["2", "3"], createdAt: new Date("2026-09-11T00:00:00Z") });
    expect(summary.createdAt).toBe("2026-09-11T00:00:00.000Z");
  });
});
