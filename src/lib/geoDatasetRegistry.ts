import type { CountryCode, GeoCountryDataset, GeoRegion } from "./geoRegionTypes";

/**
 * The countries whose data is in memory right now.
 *
 * Every map surface used to hold all seven at once, because `geoRegion.ts`
 * imported fourteen JSON files at the top and built them eagerly. That is 3.5
 * MB, of which Canada is a megabyte on its own and the four admin-only
 * countries are 1.6 MB - data a public visitor downloads and is then refused
 * by the page. A country arrives here when something actually asks for it.
 *
 * Synchronous on the way out, on purpose: thirty-nine call sites read
 * `GEO_DATASETS[country]` and the framing maths runs inside a render. The
 * asynchrony is pushed to one place - `loadGeoDataset` - and the surfaces wait
 * there before they draw.
 */
const REGISTRY = new Map<CountryCode, GeoCountryDataset>();
const BY_ID = new Map<string, GeoRegion>();

export function registerGeoDataset(dataset: GeoCountryDataset): GeoCountryDataset {
  REGISTRY.set(dataset.country, dataset);
  for (const region of dataset.regions) BY_ID.set(region.id, region);
  return dataset;
}

export function geoDatasetIfLoaded(country: CountryCode): GeoCountryDataset | undefined {
  return REGISTRY.get(country);
}

export function isGeoDatasetLoaded(country: CountryCode): boolean {
  return REGISTRY.has(country);
}

export function loadedGeoCountries(): CountryCode[] {
  return [...REGISTRY.keys()];
}

export function geoRegionById(id: string): GeoRegion | undefined {
  return BY_ID.get(id);
}

export function loadedGeoRegions(): GeoRegion[] {
  return [...REGISTRY.values()].flatMap((dataset) => dataset.regions);
}

/*
 * A stand-in for a country whose chunk has not landed.
 *
 * The framing maths runs during render - twice before the data can possibly be
 * there, once on the server and once on the client's first paint - and it
 * divides by a canvas. Reading `.width` off `undefined` was a 500 on every map
 * page. A square with nothing in it keeps the arithmetic finite; the surfaces
 * draw a skeleton until the real one arrives, so none of these numbers is ever
 * seen.
 */
const EMPTY_CANVAS = 1000;

export function geoDatasetOrEmpty(country: CountryCode): GeoCountryDataset {
  const loaded = REGISTRY.get(country);
  if (loaded) return loaded;
  return {
    country,
    countryName: "",
    divisionTypeName: "",
    divisionTypePlural: "",
    viewBox: `0 0 ${EMPTY_CANVAS} ${EMPTY_CANVAS}`,
    width: EMPTY_CANVAS,
    height: EMPTY_CANVAS,
    totalRegions: 0,
    regions: [],
  };
}
