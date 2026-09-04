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

const EXPECTED_COUNTS: Record<CountryCode, number> = { JP: 47, US: 51, CA: 13, TH: 77, CN: 31, AU: 10, TW: 21 };

describe("the geo datasets", () => {
  it.each(Object.keys(EXPECTED_COUNTS) as CountryCode[])("loads every region for %s", (country) => {
    const regions = getGeoRegionsByCountry(country);
    expect(regions).toHaveLength(EXPECTED_COUNTS[country]);
    expect(GEO_DATASETS[country].totalRegions).toBe(EXPECTED_COUNTS[country]);
  });

  it("covers all countries in the combined list", () => {
    expect(getAllGeoRegions()).toHaveLength(47 + 51 + 13);
    expect(getAllGeoRegions(true)).toHaveLength(47 + 51 + 13 + 77 + 31 + 10 + 21);
  });

  it("gives every region a globally unique id", () => {
    const ids = getAllGeoRegions(true).map((region) => region.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("finds a region by its composite id in each country", () => {
    expect(getGeoRegionById("JP-1")?.country).toBe("JP");
    expect(getGeoRegionById("US-CA")?.name).toBe("California");
    expect(getGeoRegionById("CA-ON")?.name).toBe("Ontario");
    expect(getGeoRegionById("TH-10")?.country).toBe("TH");
    expect(getGeoRegionById("CN-BJ")?.country).toBe("CN");
    expect(getGeoRegionById("AU-NSW")?.country).toBe("AU");
    expect(getGeoRegionById("TW-TPE")?.country).toBe("TW");
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

  it("gives all pilot regions names, capitals, and valid map paths", () => {
    const all = getAllGeoRegions(true);
    expect(all.filter((region) => !region.name?.trim())).toHaveLength(0);
    expect(all.filter((region) => !region.capital?.name?.trim())).toHaveLength(0);
    expect(all.filter((region) => !region.map?.path?.trim())).toHaveLength(0);
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

/**
 * The heading used to build its plural by adding an "s" to the singular,
 * which reads fine for prefectures and states and gave Canada
 * "All 13 province / territorys". English plurals are not a suffix, and a
 * slashed pair is not one noun.
 */
describe("what a country calls its parts", () => {
  /*
   * Adding an "s" is right for two of the three, which is exactly why it
   * survived: the derivation only breaks where the singular is a slashed
   * pair, so the plural has to be written down rather than worked out.
   */
  it("carries a written plural for every dataset", () => {
    for (const country of ["JP", "US", "CA"] as const) {
      const dataset = GEO_DATASETS[country];
      expect(dataset.divisionTypePlural.length, country).toBeGreaterThan(1);
      expect(dataset.divisionTypePlural, country).not.toContain("/");
    }
  });

  it("says provinces and territories rather than province / territorys", () => {
    expect(GEO_DATASETS.CA.divisionTypePlural).toBe("Provinces and territories");
    expect(GEO_DATASETS.CA.divisionTypePlural).not.toContain("/");
    expect(GEO_DATASETS.JP.divisionTypePlural).toBe("Prefectures");
    expect(GEO_DATASETS.US.divisionTypePlural).toBe("States");
  });
});
