import mapData from "@/data/maps/ca-map.json";
import metaData from "@/data/maps/ca-meta.json";

export interface CanadaProvinceSymbols {
  flower?: string;
  tree?: string;
  bird?: string;
}

export interface CanadaProvinceFamousFor {
  foods: string[];
  landmarks: string[];
  specialties: string[];
}

export interface CanadaProvinceMetadata {
  code: string;
  name: string;
  nameFr: string;
  type: "province" | "territory";
  capital: string;
  largestCity: string;
  population: number;
  areaKm2: number;
  areaSqMi: number;
  region: string;
  officialLanguages: string[];
  nicknames: string[];
  enteredConfederationYear: number;
  motto: string;
  no1Rankings: string[];
  famousFor: CanadaProvinceFamousFor;
  symbols: CanadaProvinceSymbols;
  centroid: [number, number];
  bbox: [number, number, number, number];
  neighbors: string[];
  path: string;
}

export interface CanadaProvincesMapItem {
  code: string;
  name: string;
  nameFr: string;
  type: "province" | "territory";
  capital: string;
  region: string;
  path: string;
  centroid: [number, number];
  bbox: [number, number, number, number];
  neighbors: string[];
}

export interface CanadaProvincesMapDataset {
  source?: string;
  country: string;
  countryName?: string;
  divisionTypeName?: string;
  viewBox: string;
  width: number;
  height: number;
  totalRegions: number;
  regions: CanadaProvincesMapItem[];
  provinces?: CanadaProvincesMapItem[];
}

export interface CanadaProvinceMetadataDataset {
  updatedAt: string;
  standard: string;
  country: string;
  countryName?: string;
  divisionTypeName?: string;
  totalRegions: number;
  regions: CanadaProvinceMetadata[];
  provinces?: CanadaProvinceMetadata[];
}

export const CANADA_PROVINCES_MAP = mapData as unknown as CanadaProvincesMapDataset;
export const CANADA_PROVINCES_LIST = CANADA_PROVINCES_MAP.regions || CANADA_PROVINCES_MAP.provinces || [];

export const CANADA_PROVINCE_METADATA_DATASET = metaData as unknown as CanadaProvinceMetadataDataset;
export const CANADA_PROVINCE_METADATA_LIST = CANADA_PROVINCE_METADATA_DATASET.regions || CANADA_PROVINCE_METADATA_DATASET.provinces || [];

const CANADA_PROVINCES_BY_CODE = new Map<string, CanadaProvinceMetadata>(
  CANADA_PROVINCE_METADATA_LIST.map((p) => [p.code.toUpperCase(), p])
);

export function getCanadaProvinceByCode(code: string): CanadaProvinceMetadata | undefined {
  return CANADA_PROVINCES_BY_CODE.get(code.toUpperCase());
}
