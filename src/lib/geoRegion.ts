import jpMap from "@/data/maps/jp-map.json";
import jpMeta from "@/data/maps/jp-meta.json";
import usMap from "@/data/maps/us-map.json";
import usMeta from "@/data/maps/us-meta.json";
import caMap from "@/data/maps/ca-map.json";
import caMeta from "@/data/maps/ca-meta.json";

export type CountryCode = "JP" | "US" | "CA";
export type DivisionType = "prefecture" | "state" | "province" | "territory" | "district";

export interface GeoRegionCapital {
  name: string;
  nameNative?: string;
  reading?: string;
}

export interface GeoRegionFamousFor {
  foods: string[];
  landmarks: string[];
  specialties: string[];
}

export interface GeoRegionSymbols {
  flower?: string;
  tree?: string;
  bird?: string;
}

export interface GeoRegionMapGeometry {
  path: string;
  centroid: [number, number];
  bbox: [number, number, number, number];
  neighbors: (string | number)[];
  inset?: boolean;
}

export interface GeoRegionExtras {
  kanjiTagging?: {
    prefectureKanji: string[];
    mextGrade4PrefectureKanji: string[];
    kanjiGrades?: number[];
  };
  historicalProvinces?: string[];
  emblem?: {
    description: string;
    symbolChar?: string;
  };
  officialLanguages?: string[];
  motto?: string;
  statehoodOrder?: number;
  admittedYear?: number;
  enteredConfederationYear?: number;
}

export interface GeoRegion {
  /** Global unique composite identifier, e.g. "JP-1", "US-CA", "CA-ON" */
  id: string;
  /** Regional code, e.g. 1, "CA", "ON" */
  code: string | number;
  country: CountryCode;
  divisionType: DivisionType;
  name: string;
  nameNative?: string;
  reading?: string;
  capital: GeoRegionCapital;
  largestCity?: string;
  region: string;
  population: number;
  areaKm2: number;
  areaSqMi: number;
  nicknames: string[];
  no1Rankings: string[];
  famousFor: GeoRegionFamousFor;
  symbols?: GeoRegionSymbols;
  map: GeoRegionMapGeometry;
  extras?: GeoRegionExtras;
}

export interface GeoCountryDataset {
  country: CountryCode;
  countryName: string;
  divisionTypeName: string;
  viewBox: string;
  width: number;
  height: number;
  totalRegions: number;
  regions: GeoRegion[];
}

function roundTo(num: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(num * factor) / factor;
}

interface RawJpMetaItem {
  code: number;
  romaji: string;
  kanji: string;
  kanjiFull?: string;
  reading: string;
  region: string;
  capital: { kanji: string; romaji: string; reading: string };
  largestCity?: { kanji: string; romaji: string; reading: string };
  population: number;
  areaKm2: number;
  nicknames?: string[];
  no1Rankings?: string[];
  famousFor?: GeoRegionFamousFor;
  symbols?: GeoRegionSymbols;
  kanjiTagging?: GeoRegionExtras["kanjiTagging"];
  historicalProvinces?: string[];
  emblem?: GeoRegionExtras["emblem"];
}

interface RawJpMapItem {
  code: number;
  path: string;
  centroid: [number, number];
  bbox: [number, number, number, number];
  neighbors: number[];
  inset?: boolean;
}

interface RawUsMetaItem {
  code: string;
  name: string;
  capital: string;
  largestCity?: string;
  region: string;
  population: number;
  areaKm2: number;
  areaSqMi: number;
  nicknames?: string[];
  no1Rankings?: string[];
  famousFor?: GeoRegionFamousFor;
  symbols?: GeoRegionSymbols;
  statehoodOrder?: number;
  admittedYear?: number;
  path?: string;
  centroid?: [number, number];
  bbox?: [number, number, number, number];
  neighbors?: string[];
}

interface RawUsMapItem {
  code: string;
  path: string;
  centroid: [number, number];
  bbox: [number, number, number, number];
  neighbors: string[];
}

interface RawCaMetaItem {
  code: string;
  name: string;
  nameFr?: string;
  type: string;
  capital: string;
  largestCity?: string;
  region: string;
  population: number;
  areaKm2: number;
  areaSqMi: number;
  nicknames?: string[];
  no1Rankings?: string[];
  famousFor?: GeoRegionFamousFor;
  symbols?: GeoRegionSymbols;
  officialLanguages?: string[];
  motto?: string;
  enteredConfederationYear?: number;
  path?: string;
  centroid?: [number, number];
  bbox?: [number, number, number, number];
  neighbors?: string[];
}

interface RawCaMapItem {
  code: string;
  path: string;
  centroid: [number, number];
  bbox: [number, number, number, number];
  neighbors: string[];
}

// Normalized loaders
function buildJapanRegions(): GeoRegion[] {
  const metaList = (jpMeta.regions || jpMeta.prefectures || []) as unknown as RawJpMetaItem[];
  const mapList = (jpMap.regions || jpMap.prefectures || []) as unknown as RawJpMapItem[];
  const mapByCode = new Map<number, RawJpMapItem>(mapList.map((m) => [m.code, m]));

  return metaList.map((meta) => {
    const geom = mapByCode.get(meta.code);
    return {
      id: `JP-${meta.code}`,
      code: meta.code,
      country: "JP",
      divisionType: "prefecture",
      name: meta.romaji,
      nameNative: meta.kanjiFull || meta.kanji,
      reading: meta.reading,
      capital: {
        name: meta.capital.romaji,
        nameNative: meta.capital.kanji,
        reading: meta.capital.reading,
      },
      largestCity: meta.largestCity?.romaji || meta.capital.romaji,
      region: meta.region,
      population: meta.population,
      areaKm2: meta.areaKm2,
      areaSqMi: roundTo(meta.areaKm2 * 0.386102),
      nicknames: meta.nicknames || [],
      no1Rankings: meta.no1Rankings || [],
      famousFor: meta.famousFor || { foods: [], landmarks: [], specialties: [] },
      symbols: meta.symbols,
      map: {
        path: geom?.path || "",
        centroid: geom?.centroid || [0, 0],
        bbox: geom?.bbox || [0, 0, 0, 0],
        neighbors: geom?.neighbors || [],
        inset: geom?.inset || false,
      },
      extras: {
        kanjiTagging: meta.kanjiTagging,
        historicalProvinces: meta.historicalProvinces,
        emblem: meta.emblem,
      },
    };
  });
}

function buildUsRegions(): GeoRegion[] {
  const metaList = (usMeta.regions || (usMeta as Record<string, unknown>).states || []) as unknown as RawUsMetaItem[];
  const mapList = (usMap.regions || (usMap as Record<string, unknown>).states || []) as unknown as RawUsMapItem[];
  const mapByCode = new Map<string, RawUsMapItem>(mapList.map((m) => [m.code, m]));

  return metaList.map((meta) => {
    const geom = mapByCode.get(meta.code);
    return {
      id: `US-${meta.code}`,
      code: meta.code,
      country: "US",
      divisionType: meta.code === "DC" ? "district" : "state",
      name: meta.name,
      nameNative: meta.name,
      capital: {
        name: meta.capital,
        nameNative: meta.capital,
      },
      largestCity: meta.largestCity,
      region: meta.region,
      population: meta.population,
      areaKm2: meta.areaKm2,
      areaSqMi: meta.areaSqMi,
      nicknames: meta.nicknames || [],
      no1Rankings: meta.no1Rankings || [],
      famousFor: meta.famousFor || { foods: [], landmarks: [], specialties: [] },
      symbols: meta.symbols,
      map: {
        path: geom?.path || meta.path || "",
        centroid: geom?.centroid || meta.centroid || [0, 0],
        bbox: geom?.bbox || meta.bbox || [0, 0, 0, 0],
        neighbors: geom?.neighbors || meta.neighbors || [],
      },
      extras: {
        statehoodOrder: meta.statehoodOrder,
        admittedYear: meta.admittedYear,
      },
    };
  });
}

function buildCanadaRegions(): GeoRegion[] {
  const metaList = (caMeta.regions || (caMeta as Record<string, unknown>).provinces || []) as unknown as RawCaMetaItem[];
  const mapList = (caMap.regions || (caMap as Record<string, unknown>).provinces || []) as unknown as RawCaMapItem[];
  const mapByCode = new Map<string, RawCaMapItem>(mapList.map((m) => [m.code, m]));

  return metaList.map((meta) => {
    const geom = mapByCode.get(meta.code);
    return {
      id: `CA-${meta.code}`,
      code: meta.code,
      country: "CA",
      divisionType: meta.type as DivisionType,
      name: meta.name,
      nameNative: meta.nameFr || meta.name,
      capital: {
        name: meta.capital,
        nameNative: meta.capital,
      },
      largestCity: meta.largestCity,
      region: meta.region,
      population: meta.population,
      areaKm2: meta.areaKm2,
      areaSqMi: meta.areaSqMi,
      nicknames: meta.nicknames || [],
      no1Rankings: meta.no1Rankings || [],
      famousFor: meta.famousFor || { foods: [], landmarks: [], specialties: [] },
      symbols: meta.symbols,
      map: {
        path: geom?.path || meta.path || "",
        centroid: geom?.centroid || meta.centroid || [0, 0],
        bbox: geom?.bbox || meta.bbox || [0, 0, 0, 0],
        neighbors: geom?.neighbors || meta.neighbors || [],
      },
      extras: {
        officialLanguages: meta.officialLanguages,
        motto: meta.motto,
        enteredConfederationYear: meta.enteredConfederationYear,
      },
    };
  });
}

// Datasets
const JAPAN_REGIONS = buildJapanRegions();
const US_REGIONS = buildUsRegions();
const CANADA_REGIONS = buildCanadaRegions();

const ALL_REGIONS = [...JAPAN_REGIONS, ...US_REGIONS, ...CANADA_REGIONS];
const REGIONS_BY_ID = new Map<string, GeoRegion>(ALL_REGIONS.map((r) => [r.id, r]));

export const GEO_DATASETS: Record<CountryCode, GeoCountryDataset> = {
  JP: {
    country: "JP",
    countryName: "Japan",
    divisionTypeName: "Prefecture",
    viewBox: jpMap.viewBox || "0 0 1000 1107.9",
    width: jpMap.width || 1000,
    height: jpMap.height || 1107.9,
    totalRegions: JAPAN_REGIONS.length,
    regions: JAPAN_REGIONS,
  },
  US: {
    country: "US",
    countryName: "United States",
    divisionTypeName: "State",
    viewBox: usMap.viewBox || "0 0 1000 800",
    width: usMap.width || 1000,
    height: usMap.height || 800,
    totalRegions: US_REGIONS.length,
    regions: US_REGIONS,
  },
  CA: {
    country: "CA",
    countryName: "Canada",
    divisionTypeName: "Province / Territory",
    viewBox: caMap.viewBox || "0 0 1000 800",
    width: caMap.width || 1000,
    height: caMap.height || 800,
    totalRegions: CANADA_REGIONS.length,
    regions: CANADA_REGIONS,
  },
};

/** Query any geographic region by its composite ID (e.g. "JP-13", "US-CA", "CA-QC") */
export function getGeoRegionById(id: string): GeoRegion | undefined {
  return REGIONS_BY_ID.get(id);
}

/** Get all regions for a specific country */
export function getGeoRegionsByCountry(country: CountryCode): GeoRegion[] {
  return GEO_DATASETS[country]?.regions || [];
}

/** Get all regions across all loaded countries */
export function getAllGeoRegions(): GeoRegion[] {
  return ALL_REGIONS;
}
