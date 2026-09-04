import auCities from "@/data/maps/au-cities.json";
import caCities from "@/data/maps/ca-cities.json";
import cnCities from "@/data/maps/cn-cities.json";
import jpCities from "@/data/maps/jp-cities.json";
import thCities from "@/data/maps/th-cities.json";
import twCities from "@/data/maps/tw-cities.json";
import usCities from "@/data/maps/us-cities.json";

import type { CountryCode } from "./geoRegionTypes";

/**
 * Cities drawn over a country's own map.
 *
 * The coordinates are already in the map's canvas, projected by
 * `scripts/build-geo-cities.mjs` through the very same projection the
 * boundaries went through - so a city needs no transform here, and cannot
 * drift from the outline under it.
 *
 * Every country whose map is loaded has one, Japan and the United States
 * included. Neither needed migrating to Natural Earth: the United States is
 * drawn through `geoAlbersUsa`, which the city builder rebuilds exactly - and
 * which carries Alaska and Hawaii in their own insets, so their cities land in
 * those boxes without a special case. Japan's outlines are curated Mercator
 * paths with no projection in code, so the builder recovers the transform by
 * least squares and refuses to write the file unless every city lands inside
 * its own prefecture.
 *
 * The other 25 Natural Earth countries are built and committed but not
 * imported here, the same way their maps are: loading all thirty-two would
 * pull three quarters of a megabyte of points in for maps nobody can open yet.
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
  JP: jpCities as MapCityset,
  US: usCities as MapCityset,
  CA: caCities as MapCityset,
  TH: thCities as MapCityset,
  CN: cnCities as MapCityset,
  AU: auCities as MapCityset,
  TW: twCities as MapCityset,
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
 * Every city we draw, across every map that has them.
 *
 * The accreditation page's figure. Counted rather than typed, so adding a
 * country's cities cannot leave the page claiming a total nobody has.
 */
export function totalCitiesPlaced(): number {
  return Object.values(CITYSETS).reduce((sum, set) => sum + (set?.totalCities ?? 0), 0);
}

/** The countries whose maps draw cities, for the tests and the report. */
export function countriesWithCities(): CountryCode[] {
  return Object.keys(CITYSETS) as CountryCode[];
}

/**
 * The cities of one division, from a list already narrowed by density.
 *
 * Takes the cities rather than fetching them so the panel cannot disagree with
 * the map beside it: both are drawing the same set, one framed on a region.
 * Turning cities off empties this too, which is the point - there is one
 * switch, and it means the same thing wherever a map is drawn.
 */
export function citiesOfRegion(cities: MapCity[], code: string | number | null): MapCity[] {
  if (code === null) return [];
  const wanted = String(code);
  return cities.filter((city) => city.region === wanted);
}

/**
 * A division's capital, taken from the only place that actually knows.
 *
 * Natural Earth marks capitals in Populated Places - `Admin-1 capital` on the
 * city itself. The boundary builder had no such field and fell back to the
 * division's own name, or to whatever `name_alt` held, so France's Aisne was
 * given the capital "Aisne" and Ain was given "Rhone-Alpes", which is a region
 * rather than a city. Both were inventions presented as fact.
 *
 * Null where Natural Earth does not say. Ninety-four of France's ninety-six
 * departments come back null, and that is the correct answer.
 */
export function capitalOfRegion(country: CountryCode, code: string | number | null): MapCity | null {
  if (code === null) return null;
  const cityset = CITYSETS[country];
  if (!cityset) return null;
  const wanted = String(code);
  return cityset.cities.find((city) => city.region === wanted && city.capital !== null) ?? null;
}
