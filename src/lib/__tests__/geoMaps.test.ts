import { describe, expect, it } from "vitest";

import {
  JAPAN_PREFECTURE_METADATA_LIST,
  getPrefectureMetadataByCode,
} from "../japanPrefectures";
import {
  US_STATES_MAP,
  US_STATE_METADATA_LIST,
  getUsStateByCode,
} from "../usStates";
import {
  CANADA_PROVINCES_MAP,
  CANADA_PROVINCE_METADATA_LIST,
  getCanadaProvinceByCode,
} from "../canadaProvinces";
import {
  getAllRegionSizeComparisons,
  compareArea,
  comparePopulation,
} from "../geoComparisons";
import {
  GEO_DATASETS,
  getAllGeoRegions,
  getGeoRegionById,
  getGeoRegionsByCountry,
} from "../geoRegion";

describe("Geographic Datasets & Schema Integrity (Japan, USA, Canada)", () => {
  it("enforces strict count invariants across all 3 countries", () => {
    const all = getAllGeoRegions();
    expect(all).toHaveLength(111); // 47 Japan + 51 USA + 13 Canada

    const jp = getGeoRegionsByCountry("JP");
    expect(jp).toHaveLength(47);

    const us = getGeoRegionsByCountry("US");
    expect(us).toHaveLength(51); // 50 States + DC

    const ca = getGeoRegionsByCountry("CA");
    expect(ca).toHaveLength(13); // 10 Provinces + 3 Territories

    // Test getGeoRegionById lookups
    const tokyo = getGeoRegionById("JP-13");
    expect(tokyo?.name).toBe("Tokyo");
    expect(tokyo?.country).toBe("JP");

    const cali = getGeoRegionById("US-CA");
    expect(cali?.name).toBe("California");
    expect(cali?.country).toBe("US");

    const ont = getGeoRegionById("CA-ON");
    expect(ont?.name).toBe("Ontario");
    expect(ont?.country).toBe("CA");
  });

  it("enforces country-agnostic dataset schema across all datasets", () => {
    for (const country of ["JP", "US", "CA"] as const) {
      const dataset = GEO_DATASETS[country];
      expect(dataset).toBeDefined();
      expect(dataset.country).toBe(country);
      expect(dataset.countryName).toBeDefined();
      expect(dataset.divisionTypeName).toBeDefined();
      expect(dataset.totalRegions).toBe(dataset.regions.length);
      expect(dataset.viewBox).toBeDefined();
      expect(dataset.width).toBeGreaterThan(0);
      expect(dataset.height).toBeGreaterThan(0);

      // Verify every region in the generic dataset conforms to GeoRegion
      for (const region of dataset.regions) {
        expect(region.id).toMatch(new RegExp(`^${country}-`));
        expect(region.code).toBeDefined();
        expect(region.country).toBe(country);
        expect(region.divisionType).toBeDefined();
        expect(region.name.length).toBeGreaterThan(0);
        expect(region.capital.name.length).toBeGreaterThan(0);
        expect(region.population).toBeGreaterThan(0);
        expect(region.areaKm2).toBeGreaterThan(0);
        expect(region.areaSqMi).toBeGreaterThan(0);
        expect(region.famousFor.foods.length).toBeGreaterThan(0);
        expect(region.famousFor.landmarks.length).toBeGreaterThan(0);
        expect(region.map.path.length).toBeGreaterThan(0);
        expect(region.map.centroid).toHaveLength(2);
        expect(region.map.bbox).toHaveLength(4);
      }
    }
  });

  it("guarantees unique region IDs with zero collisions across all 111 regions", () => {
    const all = getAllGeoRegions();
    const ids = new Set(all.map((r) => r.id));
    expect(ids.size).toBe(111);
  });

  it("verifies all 50 US States + District of Columbia exist and contain valid metadata", () => {
    expect(US_STATES_MAP.regions).toHaveLength(51);
    expect(US_STATE_METADATA_LIST).toHaveLength(51);

    const EXPECTED_US_CODES = [
      "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
      "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
      "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
      "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
      "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
      "DC"
    ];

    expect(EXPECTED_US_CODES).toHaveLength(51);

    for (const code of EXPECTED_US_CODES) {
      const state = getUsStateByCode(code);
      expect(state, `Expected state with code ${code} to exist`).toBeDefined();
      if (!state) continue;

      expect(state.code).toBe(code);
      expect(state.name.length).toBeGreaterThan(0);
      expect(state.capital.length).toBeGreaterThan(0);
      expect(state.population).toBeGreaterThan(0);
      expect(state.areaKm2).toBeGreaterThan(0);
      expect(state.famousFor.foods.length).toBeGreaterThan(0);
      expect(state.famousFor.landmarks.length).toBeGreaterThan(0);
      expect(state.no1Rankings.length).toBeGreaterThan(0);
    }
  });

  it("verifies all 10 Canadian Provinces and 3 Territories exist and contain valid metadata", () => {
    expect(CANADA_PROVINCES_MAP.regions).toHaveLength(13);
    expect(CANADA_PROVINCE_METADATA_LIST).toHaveLength(13);

    const EXPECTED_CA_CODES = [
      "ON", "QC", "BC", "AB", "MB", "SK", "NS", "NB", "NL", "PE", "NT", "NU", "YT"
    ];

    expect(EXPECTED_CA_CODES).toHaveLength(13);

    for (const code of EXPECTED_CA_CODES) {
      const prov = getCanadaProvinceByCode(code);
      expect(prov, `Expected Canadian province/territory with code ${code} to exist`).toBeDefined();
      if (!prov) continue;

      expect(prov.code).toBe(code);
      expect(prov.name.length).toBeGreaterThan(0);
      expect(prov.capital.length).toBeGreaterThan(0);
      expect(prov.population).toBeGreaterThan(0);
      expect(prov.areaKm2).toBeGreaterThan(0);
      expect(prov.famousFor.foods.length).toBeGreaterThan(0);
      expect(prov.famousFor.landmarks.length).toBeGreaterThan(0);
      expect(prov.no1Rankings.length).toBeGreaterThan(0);
    }
  });

  it("verifies all 47 Japanese Prefectures exist with rich rankings, emblems, and MEXT Grade 4 kanji tagging", () => {
    expect(JAPAN_PREFECTURE_METADATA_LIST).toHaveLength(47);

    for (let code = 1; code <= 47; code += 1) {
      const p = getPrefectureMetadataByCode(code);
      expect(p, `Expected prefecture code ${code} to exist`).toBeDefined();
      if (!p) continue;

      expect(p.no1Rankings.length).toBeGreaterThan(0);
      expect(p.historicIcons.length).toBeGreaterThan(0);
      expect(p.emblem).toBeDefined();
      expect(p.kanjiTagging).toBeDefined();
      expect(p.kanjiTagging.prefectureKanji.length).toBeGreaterThan(0);
    }

    // Specific domain assertions
    const aomori = getPrefectureMetadataByCode(2);
    expect(aomori?.no1Rankings[0]).toContain("Apple");
    expect(aomori?.historicIcons.some((i) => i.name.includes("Dazai"))).toBe(true);

    const shizuoka = getPrefectureMetadataByCode(22);
    expect(shizuoka?.no1Rankings[0]).toContain("Green Tea");
    expect(shizuoka?.kanjiTagging.mextGrade4PrefectureKanji).toContain("岡");

    const fukui = getPrefectureMetadataByCode(18);
    expect(fukui?.no1Rankings[0]).toContain("Eyeglass");
    expect(fukui?.kanjiTagging.mextGrade4PrefectureKanji).toContain("井");
  });

  it("calculates multi-country size and population comparisons correctly", () => {
    const all = getAllRegionSizeComparisons();
    expect(all).toHaveLength(111);

    const tokyo = all.find((r) => r.country === "JP" && r.name === "Tokyo");
    const hokkaido = all.find((r) => r.country === "JP" && r.name === "Hokkaido");
    const california = all.find((r) => r.country === "US" && r.code === "CA");
    const quebec = all.find((r) => r.country === "CA" && r.code === "QC");

    expect(tokyo && hokkaido && california && quebec).toBeTruthy();
    if (!tokyo || !hokkaido || !california || !quebec) return;

    // Area comparisons: Quebec (1.54M km²) > California (423k km²) > Hokkaido (83k km²) > Tokyo (2.1k km²)
    expect(compareArea(quebec, california)).toBeGreaterThan(0);
    expect(compareArea(california, hokkaido)).toBeGreaterThan(0);
    expect(compareArea(hokkaido, tokyo)).toBeGreaterThan(0);

    // Population comparisons: California (38.9M) > Tokyo (14.1M) > Quebec (8.9M) > Hokkaido (5.1M)
    expect(comparePopulation(california, tokyo)).toBeGreaterThan(0);
    expect(comparePopulation(tokyo, quebec)).toBeGreaterThan(0);
    expect(comparePopulation(quebec, hokkaido)).toBeGreaterThan(0);
  });
});
