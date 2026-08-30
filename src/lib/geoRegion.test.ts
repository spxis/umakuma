import { describe, expect, it } from "vitest";

import {
  GEO_DATASETS,
  getAllGeoRegions,
  getGeoRegionById,
  getGeoRegionsByCountry,
  type CountryCode,
} from "./geoRegion";

/*
 * The map games read every one of these fields straight onto a tile: a missing
 * capital or a zero area is a question with no answer, and the failure shows up
 * as a broken round rather than as a build error. These pin the dataset the
 * generators produce.
 */

const EXPECTED_COUNTS: Record<CountryCode, number> = { JP: 47, US: 51, CA: 13 };

describe("the geo datasets", () => {
  it.each(Object.keys(EXPECTED_COUNTS) as CountryCode[])("loads every region for %s", (country) => {
    const regions = getGeoRegionsByCountry(country);
    expect(regions).toHaveLength(EXPECTED_COUNTS[country]);
    expect(GEO_DATASETS[country].totalRegions).toBe(EXPECTED_COUNTS[country]);
  });

  it("covers all three countries in the combined list", () => {
    expect(getAllGeoRegions()).toHaveLength(47 + 51 + 13);
  });

  it("gives every region a globally unique id", () => {
    const ids = getAllGeoRegions().map((region) => region.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("finds a region by its composite id in each country", () => {
    expect(getGeoRegionById("JP-1")?.country).toBe("JP");
    expect(getGeoRegionById("US-CA")?.name).toBe("California");
    expect(getGeoRegionById("CA-ON")?.name).toBe("Ontario");
  });

  it("returns nothing for an id no country uses", () => {
    expect(getGeoRegionById("XX-99")).toBeUndefined();
  });
});

describe("the fields the map games ask questions about", () => {
  const regions = getAllGeoRegions();

  it("names a capital for every region", () => {
    const missing = regions.filter((region) => !region.capital?.name?.trim());
    expect(missing.map((region) => region.id)).toEqual([]);
  });

  it("gives every region a positive population and area", () => {
    const bad = regions.filter((region) => !(region.population > 0) || !(region.areaKm2 > 0));
    expect(bad.map((region) => region.id)).toEqual([]);
  });

  it("gives every region a display name", () => {
    expect(regions.filter((region) => !region.name?.trim())).toHaveLength(0);
  });

  it("carries the Japanese reading and kanji a prefecture is drilled on", () => {
    const jp = getGeoRegionsByCountry("JP");
    expect(jp.filter((region) => !region.nameNative?.trim() || !region.reading?.trim())).toHaveLength(0);
  });
});

describe("spot checks against known geography", () => {
  it("knows the capitals", () => {
    expect(getGeoRegionById("US-CA")?.capital.name).toBe("Sacramento");
    expect(getGeoRegionById("CA-ON")?.capital.name).toBe("Toronto");
  });

  /*
   * Hokkaido, Alaska and Nunavut are the largest division in their country by a
   * wide margin, so an area column that silently loses its units or its scale
   * stops being true here first.
   */
  it("puts the largest division of each country on top by area", () => {
    const largest = (country: CountryCode) =>
      [...getGeoRegionsByCountry(country)].sort((a, b) => b.areaKm2 - a.areaKm2)[0];

    expect(largest("JP").name).toMatch(/Hokkaid/i);
    expect(largest("US").name).toBe("Alaska");
    expect(largest("CA").name).toBe("Nunavut");
  });
});
