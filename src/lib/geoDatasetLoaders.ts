import { geoDatasetIfLoaded, registerGeoDataset } from "./geoDatasetRegistry";
import type { CountryCode, GeoCountryDataset } from "./geoRegionTypes";

/**
 * One country's data, fetched the first time somebody needs it.
 *
 * Each entry is its own dynamic import, so the bundler gives each country its
 * own chunk and the browser fetches exactly the one on screen. Written out
 * rather than built from a template because a bundler can only split what it
 * can see spelled out.
 */
const LOADERS: Record<CountryCode, () => Promise<{ default: GeoCountryDataset }>> = {
  JP: () => import("./geoDatasets/jp"),
  US: () => import("./geoDatasets/us"),
  CA: () => import("./geoDatasets/ca"),
  TH: () => import("./geoDatasets/th"),
  CN: () => import("./geoDatasets/cn"),
  AU: () => import("./geoDatasets/au"),
  TW: () => import("./geoDatasets/tw"),
};

/* One flight per country, however many callers ask at once. */
const IN_FLIGHT = new Map<CountryCode, Promise<GeoCountryDataset>>();

export async function loadGeoDataset(country: CountryCode): Promise<GeoCountryDataset> {
  const already = geoDatasetIfLoaded(country);
  if (already) return already;

  const flying = IN_FLIGHT.get(country);
  if (flying) return flying;

  const flight = LOADERS[country]()
    .then((module) => registerGeoDataset(module.default))
    .finally(() => IN_FLIGHT.delete(country));
  IN_FLIGHT.set(country, flight);
  return flight;
}

export const GEO_DATASET_COUNTRIES = Object.keys(LOADERS) as CountryCode[];
