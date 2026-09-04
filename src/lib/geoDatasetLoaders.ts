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
  AR: () => import("./geoDatasets/ar"),
  AT: () => import("./geoDatasets/at"),
  AU: () => import("./geoDatasets/au"),
  BE: () => import("./geoDatasets/be"),
  BR: () => import("./geoDatasets/br"),
  CA: () => import("./geoDatasets/ca"),
  CH: () => import("./geoDatasets/ch"),
  CL: () => import("./geoDatasets/cl"),
  CN: () => import("./geoDatasets/cn"),
  CO: () => import("./geoDatasets/co"),
  DE: () => import("./geoDatasets/de"),
  ES: () => import("./geoDatasets/es"),
  FR: () => import("./geoDatasets/fr"),
  GB: () => import("./geoDatasets/gb"),
  IE: () => import("./geoDatasets/ie"),
  IT: () => import("./geoDatasets/it"),
  JP: () => import("./geoDatasets/jp"),
  KR: () => import("./geoDatasets/kr"),
  MX: () => import("./geoDatasets/mx"),
  MY: () => import("./geoDatasets/my"),
  NL: () => import("./geoDatasets/nl"),
  NO: () => import("./geoDatasets/no"),
  NZ: () => import("./geoDatasets/nz"),
  PE: () => import("./geoDatasets/pe"),
  PH: () => import("./geoDatasets/ph"),
  PL: () => import("./geoDatasets/pl"),
  RU: () => import("./geoDatasets/ru"),
  SE: () => import("./geoDatasets/se"),
  TH: () => import("./geoDatasets/th"),
  TW: () => import("./geoDatasets/tw"),
  US: () => import("./geoDatasets/us"),
  VN: () => import("./geoDatasets/vn"),
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
