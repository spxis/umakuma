import { describe, expect, it } from "vitest";

import { GEO_DATASETS } from "./geoRegion";
import { groupRegionsByArea } from "./mapDirectory";
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
