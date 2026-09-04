import caCities from "@/data/maps/ca-cities.json";

import type { CountryCode } from "./geoRegionTypes";

/**
 * Cities drawn over a country's own map.
 *
 * The coordinates are already in the map's canvas, projected by
 * `scripts/build-geo-cities.mjs` through the very same projection the
 * boundaries went through - so a city needs no transform here, and cannot
 * drift from the outline under it.
 *
 * Canada only, as a pilot. Japan and the United States come from different
 * builders on different projections (GSI Global Map and Census TopoJSON), so
 * their canvases are not Natural Earth's and a city point would land in the
 * wrong place. They need their own ingest, not this one.
 */
export type MapCity = {
  name: string;
  /** The division code it sits in, or null where Natural Earth names none. */
  region: string | null;
  x: number;
  y: number;
  /** Natural Earth's scalerank: 1 is a city everyone knows, 8 is a hamlet. */
  rank: number;
  capital: "country" | "region" | null;
  population: number;
};

export type MapCityset = {
  country: string;
  countryName: string;
  width: number;
  height: number;
  totalCities: number;
  cities: MapCity[];
};

/**
 * How many cities to draw.
 *
 * All 255 at once is unreadable on a phone and most of a mess on a laptop, and
 * dropping to Natural Earth's sparser file would have thrown the other 210
 * away for good. Its own scalerank does the work instead: rank <= 4 is exactly
 * the 45 places the 50m file holds, so the middle step is the sparse dataset
 * without a second ingest, and All is still there for anyone who wants it.
 */
export const CITY_DENSITIES = ["capitals", "major", "all"] as const;
export type CityDensity = (typeof CITY_DENSITIES)[number];

export const MAJOR_CITY_RANK = 4;

const CITYSETS: Partial<Record<CountryCode, MapCityset>> = {
  CA: caCities as MapCityset,
};

export function isCityDensity(value: string): value is CityDensity {
  return (CITY_DENSITIES as readonly string[]).includes(value);
}

/** Whether this country has a city layer at all. */
export function hasCities(country: CountryCode): boolean {
  return Boolean(CITYSETS[country]);
}

export function citysetFor(country: CountryCode): MapCityset | null {
  return CITYSETS[country] ?? null;
}

/** A city counts as a capital whether it is the country's or a division's. */
export function isCapital(city: MapCity): boolean {
  return city.capital !== null;
}

export function citiesAtDensity(country: CountryCode, density: CityDensity): MapCity[] {
  const cityset = CITYSETS[country];
  if (!cityset) return [];
  if (density === "all") return cityset.cities;
  if (density === "major") return cityset.cities.filter((city) => city.rank <= MAJOR_CITY_RANK || isCapital(city));
  return cityset.cities.filter(isCapital);
}

/** How many each step would draw, for the labels on the density control. */
export function cityDensityCounts(country: CountryCode): Record<CityDensity, number> {
  return {
    capitals: citiesAtDensity(country, "capitals").length,
    major: citiesAtDensity(country, "major").length,
    all: citiesAtDensity(country, "all").length,
  };
}

/**
 * The cities of one division, most important first.
 *
 * Used by the region panel, where the question is "what is in Ontario" rather
 * than "what is on the map", so the density control does not apply.
 */
export function citiesInRegion(country: CountryCode, code: string | number | null): MapCity[] {
  if (code === null) return [];
  const cityset = CITYSETS[country];
  if (!cityset) return [];
  return cityset.cities.filter((city) => city.region === String(code));
}
