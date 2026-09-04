import { describe, expect, it } from "vitest";

import caMap from "@/data/maps/ca-map.json";

import {
  CITY_DENSITIES,
  MAJOR_CITY_RANK,
  citiesAtDensity,
  cityDensityCounts,
  citysetFor,
  hasCities,
  isCapital,
  isCityDensity,
} from "./geoCities";

const cityset = citysetFor("CA")!;
const boxes = new Map(
  (caMap as unknown as { regions: Array<{ code: string; bbox: [number, number, number, number] }> }).regions.map(
    (region) => [region.code, region.bbox] as const,
  ),
);

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
 * Japan and the United States are drawn from GSI Global Map and Census
 * TopoJSON, on their own projections, so a Natural Earth city point would land
 * somewhere arbitrary on those canvases. They get no layer until they get their
 * own ingest - and the toggle must not appear for them.
 */
describe("countries without a city layer", () => {
  it("are every country but Canada", () => {
    expect(hasCities("CA")).toBe(true);
    expect(hasCities("JP")).toBe(false);
    expect(hasCities("US")).toBe(false);
    expect(citiesAtDensity("JP", "all")).toEqual([]);
    expect(citysetFor("US")).toBeNull();
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
