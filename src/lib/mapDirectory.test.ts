import { describe, expect, it } from "vitest";

import { GEO_DATASETS } from "./geoRegion";
import { areaNameOf, areasOf, groupRegionsByArea, regionCodesInArea } from "./mapDirectory";
import { regionsInOrder } from "./mapStudy";

const japan = regionsInOrder("JP");

describe("the country, grouped for reading", () => {
  it("keeps every region exactly once", () => {
    const grouped = groupRegionsByArea(japan).flatMap((area) => area.regions);
    expect(grouped).toHaveLength(GEO_DATASETS.JP.totalRegions);
    expect(new Set(grouped.map((region) => region.id)).size).toBe(japan.length);
  });

  /* Eight areas is how a Japanese map is taught, and how the data names them. */
  it("finds the areas a Japanese map is read in", () => {
    const areas = groupRegionsByArea(japan).map((area) => area.name);
    expect(areas.length).toBeGreaterThan(1);
    expect(areas).toContain("Kanto");
    expect(new Set(areas).size).toBe(areas.length);
  });

  /*
   * Order twice over: the areas in the order their first region appears, and
   * each area in the order it was given. Japan is numbered north to south, so
   * Hokkaido opens the list and Okinawa closes it.
   */
  it("holds the order it was given, inside and out", () => {
    const areas = groupRegionsByArea(japan);
    expect(areas[0]?.regions[0]?.name).toBe("Hokkaido");
    expect(areas.at(-1)?.regions.at(-1)?.name).toBe("Okinawa");
    const kanto = areas.find((area) => area.name === "Kanto")!;
    const codes = kanto.regions.map((region) => Number(region.code));
    expect([...codes].sort((a, b) => a - b)).toEqual(codes);
  });

  it("groups nothing into nothing", () => {
    expect(groupRegionsByArea([])).toEqual([]);
  });
});

/**
 * The same grouping, asked two more ways.
 *
 * The directory reads it as sections; the address and the map read it as a
 * list of names and the codes under each. All three go through one rule, so a
 * heading and the shapes it lights can never disagree about what is in Tohoku.
 */
describe("the same regions, by name", () => {
  it("names every region once, in the order the country is read", () => {
    const names = areasOf(japan);
    expect(names.slice(0, 3)).toEqual(["Hokkaido", "Tohoku", "Kanto"]);
    expect(names).toEqual(groupRegionsByArea(japan).map((area) => area.name));
  });

  it("puts every prefecture in exactly one region", () => {
    const placed = areasOf(japan).flatMap((name) => regionCodesInArea(japan, name));
    expect(placed).toHaveLength(japan.length);
    expect(new Set(placed.map(String)).size).toBe(japan.length);
    for (const region of japan) expect(regionCodesInArea(japan, areaNameOf(region))).toContain(region.code);
  });

  it("answers an unknown region with nothing rather than throwing", () => {
    expect(regionCodesInArea(japan, "Atlantis")).toEqual([]);
    expect(regionCodesInArea(japan, null)).toEqual([]);
  });
});
