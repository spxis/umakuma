import { describe, expect, it } from "vitest";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import caMap from "@/data/maps/ca-map.json";

import { GEO_DATASETS, type CountryCode } from "./geoRegion";
import {
  CITY_DENSITIES,
  MAJOR_CITY_RANK,
  citiesAtDensity,
  cityDensityCounts,
  citysetFor,
  countriesWithCities,
  hasCities,
  isCapital,
  isCityDensity,
  totalCitiesPlaced,
} from "./geoCities";

const cityset = citysetFor("CA")!;
const boxes = new Map(
  (caMap as unknown as { regions: Array<{ code: string; bbox: [number, number, number, number] }> }).regions.map(
    (region) => [region.code, region.bbox] as const,
  ),
);

const mapBoxes = (country: CountryCode) =>
  new Map(GEO_DATASETS[country].regions.map((region) => [String(region.code), region.map.bbox] as const));

/*
 * The whole promise of the city layer is that a point lands on the province it
 * belongs to, and it only holds because `build-geo-cities.mjs` projects the
 * points through the very same projection `build-geo-countries.mjs` fitted to
 * the boundaries. Nothing at runtime transforms a city, so if that ever stops
 * being true this is where it shows: rebuild the boundaries on a different
 * projection without rebuilding the cities and every one of these moves.
 *
 * Measured against `ca-map.json`, never `ca-meta.json`. Canada's builder config
 * sets `skipMetaWrite`, so the meta still carries the retired builder's round
 * hand-typed boxes ([480, 420, 680, 620] for Ontario) which describe a canvas
 * that no longer exists. Checking against those said 131 of 255 cities were
 * misplaced when in fact none were.
 */
describe("Canada's cities", () => {
  it("each sit inside the province they are filed under", () => {
    const strays: string[] = [];
    for (const city of cityset.cities) {
      const box = city.region ? boxes.get(city.region) : null;
      if (!box) continue;
      const [x0, y0, x1, y1] = box;
      const inside = city.x >= x0 - 2 && city.x <= x1 + 2 && city.y >= y0 - 2 && city.y <= y1 + 2;
      if (!inside) strays.push(`${city.name} (${city.region})`);
    }
    expect(strays).toEqual([]);
  });

  it("are all placed on the same canvas the outlines use", () => {
    const map = caMap as unknown as { width: number; height: number };
    expect({ width: cityset.width, height: cityset.height }).toEqual({ width: map.width, height: map.height });
    for (const city of cityset.cities) {
      expect(city.x).toBeGreaterThanOrEqual(0);
      expect(city.y).toBeGreaterThanOrEqual(0);
      expect(city.x).toBeLessThanOrEqual(cityset.width);
      expect(city.y).toBeLessThanOrEqual(cityset.height);
    }
  });

  it("name a region that the map actually has", () => {
    for (const city of cityset.cities) {
      if (city.region === null) continue;
      expect(boxes.has(city.region)).toBe(true);
    }
  });

  it("include one national capital and a capital for every province and territory", () => {
    const national = cityset.cities.filter((city) => city.capital === "country");
    expect(national.map((city) => city.name)).toEqual(["Ottawa"]);

    const regional = cityset.cities.filter((city) => city.capital === "region");
    expect(regional).toHaveLength(boxes.size);
    expect(new Set(regional.map((city) => city.region)).size).toBe(boxes.size);
  });

  it("are sorted most important first, so labels are placed in that order", () => {
    const ranks = cityset.cities.map((city) => city.rank);
    expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
  });
});

/*
 * The three steps exist because 255 at once is a mess and dropping to Natural
 * Earth's sparser file would have thrown 210 of them away. Rank <= 4 in the 10m
 * data is exactly what the 50m file holds, so the middle step is that sparser
 * dataset without a second ingest.
 */
describe("the density steps", () => {
  it("are each contained in the next", () => {
    const capitals = new Set(citiesAtDensity("CA", "capitals"));
    const major = new Set(citiesAtDensity("CA", "major"));
    const all = new Set(citiesAtDensity("CA", "all"));
    for (const city of capitals) expect(major.has(city)).toBe(true);
    for (const city of major) expect(all.has(city)).toBe(true);
    expect(capitals.size).toBeLessThan(major.size);
    expect(major.size).toBeLessThan(all.size);
  });

  it("show only capitals at the first step", () => {
    expect(citiesAtDensity("CA", "capitals").every(isCapital)).toBe(true);
  });

  it("keep every capital visible at every step, however small the town", () => {
    /* Iqaluit is a territorial capital and ranks below the major cut-off. */
    for (const density of CITY_DENSITIES) {
      const names = citiesAtDensity("CA", density).map((city) => city.name);
      expect(names).toContain("Iqaluit");
    }
  });

  it("take the middle step from the rank the sparser dataset draws at", () => {
    const major = citiesAtDensity("CA", "major");
    expect(major.every((city) => city.rank <= MAJOR_CITY_RANK || isCapital(city))).toBe(true);
  });

  it("count what they will actually draw", () => {
    const counts = cityDensityCounts("CA");
    for (const density of CITY_DENSITIES) {
      expect(counts[density]).toBe(citiesAtDensity("CA", density).length);
    }
    expect(counts.all).toBe(cityset.totalCities);
  });

  it("recognise only the three it offers", () => {
    expect(isCityDensity("major")).toBe(true);
    expect(isCityDensity("everything")).toBe(false);
  });
});

/*
 * A country has a city layer when its map is loaded, and not otherwise.
 *
 * Japan and the United States were the two this could not be done for at
 * first. Neither needed migrating in the end: the United States is drawn
 * through Albers USA, which the builder rebuilds exactly, and Japan's
 * transform is recovered from its curated canvas and checked city by city.
 */
describe("which countries have a city layer", () => {
  it("is every country whose map is loaded", () => {
    for (const country of ["JP", "US", "CA", "TH", "CN", "AU", "TW"] as const) {
      expect({ country, has: hasCities(country) }).toEqual({ country, has: true });
    }
  });

  it("is nobody whose map is not", () => {
    /* Built and committed, deliberately unimported - see the catalogue tests. */
    expect(hasCities("GB" as CountryCode)).toBe(false);
    expect(citiesAtDensity("GB" as CountryCode, "all")).toEqual([]);
    expect(citysetFor("GB" as CountryCode)).toBeNull();
  });
});

describe("places that are not cities", () => {
  it("leaves out the abandoned ones the dataset flags", () => {
    expect(cityset.cities.map((city) => city.name)).not.toContain("Ennadai");
  });

  it("keeps every remaining place a populated one", () => {
    expect(cityset.cities.filter((city) => city.population === 0)).toEqual([]);
  });
});

/*
 * The promise holds for every country, not just the one it was built for.
 *
 * Three projections produce these files - Natural Earth's own fit, Albers USA
 * rebuilt from us-atlas, and a least-squares recovery of Japan's curated
 * Mercator canvas - and the only thing that makes any of them trustworthy is
 * that a city lands inside the division it is filed under. Checked here for
 * all of them at once, because a rebuild of one map without its cities would
 * otherwise go unnoticed until somebody looked at the picture.
 *
 * Okinawa is excluded: its outline is stored already moved into the box at the
 * foot of Japan's map, so the bbox comparison is against the box rather than
 * the sea, and `MapCityLayer` applies the same move at render.
 */
describe("every country that draws cities", () => {
  it("has a cityset on the same canvas as its map", () => {
    for (const country of countriesWithCities()) {
      const set = citysetFor(country)!;
      const dataset = GEO_DATASETS[country];
      expect({ country, width: set.width, height: set.height }).toEqual({
        country,
        width: dataset.width,
        height: dataset.height,
      });
    }
  });

  it("puts every city inside the division it is filed under", () => {
    const strays: string[] = [];
    for (const country of countriesWithCities()) {
      const boxesFor = mapBoxes(country);
      for (const city of citysetFor(country)!.cities) {
        if (!city.region) continue;
        const box = boxesFor.get(city.region);
        if (!box) continue;
        const [x0, y0, x1, y1] = box;
        const inside = city.x >= x0 - 8 && city.x <= x1 + 8 && city.y >= y0 - 8 && city.y <= y1 + 8;
        if (!inside) strays.push(`${country}:${city.name}(${city.region})`);
      }
    }
    expect(strays).toEqual([]);
  });

  it("names a division the map actually has", () => {
    const unknown: string[] = [];
    for (const country of countriesWithCities()) {
      const boxesFor = mapBoxes(country);
      for (const city of citysetFor(country)!.cities) {
        if (city.region && !boxesFor.has(city.region)) unknown.push(`${country}:${city.name}(${city.region})`);
      }
    }
    expect(unknown).toEqual([]);
  });

  it("keeps every city on the canvas", () => {
    for (const country of countriesWithCities()) {
      const set = citysetFor(country)!;
      for (const city of set.cities) {
        expect(city.x).toBeGreaterThanOrEqual(0);
        expect(city.y).toBeGreaterThanOrEqual(0);
        expect(city.x).toBeLessThanOrEqual(set.width);
        expect(city.y).toBeLessThanOrEqual(set.height);
      }
    }
  });

  it("includes Japan and the United States, which needed no migration", () => {
    expect(countriesWithCities()).toEqual(expect.arrayContaining(["JP", "US", "CA"]));
    /* Albers USA carries these two in their own boxes; nothing special-cases them. */
    const us = citysetFor("US")!.cities;
    expect(us.map((c) => c.name)).toContain("Anchorage");
    expect(us.map((c) => c.name)).toContain("Honolulu");
    /* Okinawa's cities ride into the inset with its outline. */
    expect(citysetFor("JP")!.cities.map((c) => c.name)).toContain("Naha");
  });

  it("counts the accreditation figure from the data", () => {
    const summed = countriesWithCities().reduce((n, country) => n + citysetFor(country)!.totalCities, 0);
    expect(totalCitiesPlaced()).toBe(summed);
    expect(totalCitiesPlaced()).toBeGreaterThan(1000);
  });
});

/*
 * The 25 catalogue countries are built and committed but not imported, the same
 * way their maps are: loading all thirty-two would pull three quarters of a
 * megabyte of points in for maps nobody can open yet.
 */
describe("the catalogue countries", () => {
  it("have their cities on disk", () => {
    for (const code of ["fr", "it", "es", "br", "ru", "gb"]) {
      const raw = readFileSync(join(process.cwd(), `src/data/maps/${code}-cities.json`), "utf8");
      expect((JSON.parse(raw) as { totalCities: number }).totalCities).toBeGreaterThan(0);
    }
  });

  it("are not imported into the bundle", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/geoCities.ts"), "utf8");
    for (const code of ["fr", "it", "es", "br", "ru", "gb"]) {
      expect(source).not.toContain(`${code}-cities.json`);
    }
  });
});
