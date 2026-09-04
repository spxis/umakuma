import type {
  CountryCode,
  DivisionType,
  GeoRegion,
  GeoRegionExtras,
  GeoRegionFamousFor,
  GeoRegionSymbols,
} from "./geoRegionTypes";

/**
 * How a country's two data files become regions.
 *
 * Pulled out of `geoRegion.ts` so each country can be its own module: the
 * builders take their data as arguments now rather than reading it from
 * imports at the top of a file that held all seven. That is what lets the
 * browser fetch only the country somebody is looking at - Canada's outlines
 * alone are a megabyte, and the four admin-only countries were 45% of what
 * every public visitor downloaded and could never open.
 */

/** The two files a country ships, loosely typed: each builder narrows its own. */
export type RawFile = Record<string, unknown>;
export type JpMetaFile = { regions?: unknown; prefectures?: unknown } & RawFile;
export type JpMapFile = { regions?: unknown; prefectures?: unknown } & RawFile;

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
export function buildJapanRegions(jpMeta: JpMetaFile, jpMap: JpMapFile): GeoRegion[] {
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

export function buildUsRegions(usMeta: RawFile, usMap: RawFile): GeoRegion[] {
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

export function buildCanadaRegions(caMeta: RawFile, caMap: RawFile): GeoRegion[] {
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

export function buildStandardRegions(
  country: CountryCode,
  metaData: Record<string, unknown>,
  mapData: Record<string, unknown>,
  defaultDivisionType: DivisionType = "province",
): GeoRegion[] {
  const metaList = (metaData.regions || []) as unknown as Array<{
    code: string;
    name: string;
    nameNative?: string;
    type?: string;
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
  }>;
  const mapList = (mapData.regions || []) as unknown as Array<{
    code: string;
    path: string;
    centroid: [number, number];
    bbox: [number, number, number, number];
    neighbors: string[];
  }>;
  const mapByCode = new Map(mapList.map((m) => [m.code, m]));

  return metaList.map((meta) => {
    const geom = mapByCode.get(meta.code);
    return {
      id: `${country}-${meta.code}`,
      code: meta.code,
      country,
      divisionType: (meta.type as DivisionType) || defaultDivisionType,
      name: meta.name,
      nameNative: meta.nameNative || meta.name,
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
        path: geom?.path || "",
        centroid: geom?.centroid || [0, 0],
        bbox: geom?.bbox || [0, 0, 0, 0],
        neighbors: geom?.neighbors || [],
      },
    };
  });
}

// Datasets
