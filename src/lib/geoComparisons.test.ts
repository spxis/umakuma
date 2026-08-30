import { describe, expect, it } from "vitest";

import {
  compareArea,
  comparePopulation,
  getAllRegionSizeComparisons,
  type GeoRegionSizeComparison,
} from "./geoComparisons";

const ALL = getAllRegionSizeComparisons();

function find(country: GeoRegionSizeComparison["country"], name: string): GeoRegionSizeComparison {
  const found = ALL.find((region) => region.country === country && region.name === name);
  if (!found) {
    throw new Error(`missing ${country} ${name}`);
  }
  return found;
}

describe("getAllRegionSizeComparisons", () => {
  it("flattens all three countries into one pool", () => {
    expect(ALL).toHaveLength(47 + 51 + 13);
    expect(ALL.filter((region) => region.country === "JP")).toHaveLength(47);
    expect(ALL.filter((region) => region.country === "US")).toHaveLength(51);
    expect(ALL.filter((region) => region.country === "CA")).toHaveLength(13);
  });

  /*
   * A size round picks two regions and asks which is bigger. A zero or missing
   * figure makes that question unanswerable, and every entry is a candidate.
   */
  it("gives every entry a usable population and area", () => {
    const unusable = ALL.filter(
      (region) => !Number.isFinite(region.population) || region.population <= 0 || !Number.isFinite(region.areaKm2) || region.areaKm2 <= 0,
    );
    expect(unusable.map((region) => `${region.country}-${region.code}`)).toEqual([]);
  });

  it("keeps codes unique within each country", () => {
    for (const country of ["JP", "US", "CA"] as const) {
      const codes = ALL.filter((region) => region.country === country).map((region) => String(region.code));
      expect(new Set(codes).size).toBe(codes.length);
    }
  });

  it("carries the Japanese name for prefectures so a round can show it", () => {
    expect(ALL.filter((region) => region.country === "JP" && !region.nameJa?.trim())).toHaveLength(0);
  });
});

describe("compareArea", () => {
  it("is positive when the first region is larger", () => {
    expect(compareArea(find("US", "Alaska"), find("US", "Rhode Island"))).toBeGreaterThan(0);
  });

  it("is negative when the first region is smaller", () => {
    expect(compareArea(find("US", "Rhode Island"), find("US", "Alaska"))).toBeLessThan(0);
  });

  it("is zero against itself, so a tie is a tie", () => {
    expect(compareArea(find("CA", "Nunavut"), find("CA", "Nunavut"))).toBe(0);
  });

  it("sorts a pool largest last, as an ascending comparator", () => {
    const sorted = [...ALL].sort(compareArea);
    expect(sorted[sorted.length - 1].name).toBe("Nunavut");
  });
});

describe("comparePopulation", () => {
  it("is positive when the first region is more populous", () => {
    expect(comparePopulation(find("US", "California"), find("US", "Wyoming"))).toBeGreaterThan(0);
  });

  it("ranks by people rather than land, which are not the same order", () => {
    // Alaska dwarfs California by area and is a fraction of it by population.
    expect(compareArea(find("US", "Alaska"), find("US", "California"))).toBeGreaterThan(0);
    expect(comparePopulation(find("US", "Alaska"), find("US", "California"))).toBeLessThan(0);
  });

  it("is zero against itself", () => {
    expect(comparePopulation(find("JP", "Tokyo"), find("JP", "Tokyo"))).toBe(0);
  });
});
