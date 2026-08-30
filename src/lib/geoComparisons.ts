import { JAPAN_PREFECTURE_METADATA_LIST } from "./japanPrefectures";
import { US_STATE_METADATA_LIST } from "./usStates";
import { CANADA_PROVINCE_METADATA_LIST } from "./canadaProvinces";

export interface GeoRegionSizeComparison {
  country: "JP" | "US" | "CA";
  code: string | number;
  name: string;
  nameJa?: string;
  population: number;
  areaKm2: number;
}

export function getAllRegionSizeComparisons(): GeoRegionSizeComparison[] {
  const jp: GeoRegionSizeComparison[] = JAPAN_PREFECTURE_METADATA_LIST.map((p) => ({
    country: "JP",
    code: p.code,
    name: p.romaji,
    nameJa: p.kanji,
    population: p.population,
    areaKm2: p.areaKm2,
  }));

  const us: GeoRegionSizeComparison[] = US_STATE_METADATA_LIST.map((s) => ({
    country: "US",
    code: s.code,
    name: s.name,
    population: s.population,
    areaKm2: s.areaKm2,
  }));

  const ca: GeoRegionSizeComparison[] = CANADA_PROVINCE_METADATA_LIST.map((c) => ({
    country: "CA",
    code: c.code,
    name: c.name,
    population: c.population,
    areaKm2: c.areaKm2,
  }));

  return [...jp, ...us, ...ca];
}

/**
 * Compare two geographic regions by land area (km²).
 * Returns positive if regionA is larger, negative if regionB is larger.
 */
export function compareArea(regionA: GeoRegionSizeComparison, regionB: GeoRegionSizeComparison): number {
  return regionA.areaKm2 - regionB.areaKm2;
}

/**
 * Compare two geographic regions by population.
 * Returns positive if regionA has greater population, negative if regionB has greater.
 */
export function comparePopulation(regionA: GeoRegionSizeComparison, regionB: GeoRegionSizeComparison): number {
  return regionA.population - regionB.population;
}
