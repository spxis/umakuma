import {
  geoDatasetIfLoaded,
  geoRegionById,
  loadedGeoCountries,
  loadedGeoRegions,
} from "./geoDatasetRegistry";

import type {
  CountryCode,
  DivisionType,
  GeoCountryDataset,
  GeoRegion,
  GeoRegionCapital,
  GeoRegionExtras,
  GeoRegionFamousFor,
  GeoRegionMapGeometry,
  GeoRegionSymbols,
} from "./geoRegionTypes";

export type {
  CountryCode,
  DivisionType,
  GeoCountryDataset,
  GeoRegion,
  GeoRegionCapital,
  GeoRegionExtras,
  GeoRegionFamousFor,
  GeoRegionMapGeometry,
  GeoRegionSymbols,
};

/**
 * The countries currently in memory, by code.
 *
 * A proxy over the registry rather than an object of its own. Thirty-nine call
 * sites read `GEO_DATASETS[country]` synchronously - the framing maths runs
 * inside a render - and rewriting all of them to await would have spread the
 * asynchrony across the game, the study map, the distractor pool and the
 * accreditation pages. So the shape stays exactly as it was and the waiting
 * happens in one place: `loadGeoDataset`, which the map surfaces call before
 * they draw and the server calls for everything at once.
 *
 * A country that has not been loaded reads as `undefined` here, the same as a
 * country that does not exist. Any surface that can be reached before its data
 * is must check, which is what `useGeoDataset` is for.
 */
export const GEO_DATASETS = new Proxy({} as Record<CountryCode, GeoCountryDataset>, {
  get: (_target, key: string) => geoDatasetIfLoaded(key as CountryCode),
  has: (_target, key: string) => geoDatasetIfLoaded(key as CountryCode) !== undefined,
  ownKeys: () => loadedGeoCountries(),
  getOwnPropertyDescriptor: (_target, key: string) => {
    const dataset = geoDatasetIfLoaded(key as CountryCode);
    return dataset ? { value: dataset, enumerable: true, configurable: true } : undefined;
  },
});

/** Query any geographic region by its composite ID (e.g. "JP-13", "US-CA", "CA-QC") */
export function getGeoRegionById(id: string): GeoRegion | undefined {
  return geoRegionById(id);
}

/** Get all regions for a specific country */
export function getGeoRegionsByCountry(country: CountryCode): GeoRegion[] {
  return geoDatasetIfLoaded(country)?.regions ?? [];
}

/**
 * Every region in memory.
 *
 * The old signature took `includeAdminPilot` and chose between two eagerly
 * built arrays. There is nothing to choose between now: what is loaded is what
 * was asked for, and the admin-only countries are only ever asked for by an
 * admin - which is the gate doing its job at the network as well as the page.
 */
export function getAllGeoRegions(): GeoRegion[] {
  return loadedGeoRegions();
}
