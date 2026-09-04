export type CountryCode = "JP" | "US" | "CA" | "TH" | "CN" | "AU" | "TW";
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
  divisionTypePlural: string;
  viewBox: string;
  width: number;
  height: number;
  totalRegions: number;
  regions: GeoRegion[];
}
