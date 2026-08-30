import mapData from "@/data/maps/us-map.json";
import metaData from "@/data/maps/us-meta.json";

export interface UsStateSymbols {
  flower?: string;
  tree?: string;
  bird?: string;
}

export interface UsStateFamousFor {
  foods: string[];
  landmarks: string[];
  specialties: string[];
}

export interface UsStateMetadata {
  code: string;
  name: string;
  capital: string;
  largestCity: string;
  population: number;
  areaKm2: number;
  areaSqMi: number;
  region: string;
  nicknames: string[];
  admittedYear: number;
  statehoodOrder: number;
  no1Rankings: string[];
  famousFor: UsStateFamousFor;
  symbols: UsStateSymbols;
  centroid: [number, number];
  bbox: [number, number, number, number];
  neighbors: string[];
  path: string;
}

export interface UsStatesMapItem {
  code: string;
  name: string;
  capital: string;
  region: string;
  path: string;
  centroid: [number, number];
  bbox: [number, number, number, number];
  neighbors: string[];
}

export interface UsStatesMapDataset {
  source?: string;
  country: string;
  countryName?: string;
  divisionTypeName?: string;
  viewBox: string;
  width: number;
  height: number;
  totalRegions: number;
  regions: UsStatesMapItem[];
  states?: UsStatesMapItem[];
}

export interface UsStateMetadataDataset {
  updatedAt: string;
  standard: string;
  country: string;
  countryName?: string;
  divisionTypeName?: string;
  totalRegions: number;
  regions: UsStateMetadata[];
  states?: UsStateMetadata[];
}

export const US_STATES_MAP = mapData as unknown as UsStatesMapDataset;
export const US_STATES_LIST = US_STATES_MAP.regions || US_STATES_MAP.states || [];

export const US_STATE_METADATA_DATASET = metaData as unknown as UsStateMetadataDataset;
export const US_STATE_METADATA_LIST = US_STATE_METADATA_DATASET.regions || US_STATE_METADATA_DATASET.states || [];

const US_STATES_BY_CODE = new Map<string, UsStateMetadata>(
  US_STATE_METADATA_LIST.map((s) => [s.code.toUpperCase(), s])
);

export function getUsStateByCode(code: string): UsStateMetadata | undefined {
  return US_STATES_BY_CODE.get(code.toUpperCase());
}
