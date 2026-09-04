import { describe, expect, it } from "vitest";

import { GEO_DATASETS, type CountryCode } from "./geoRegion";
import { getPlayableMapCountries } from "./mapCountries";
import { GEO_REGION_COUNTS, type GameMapCountry } from "./geoSubjectIds";

/**
 * The maps have to be maps.
 *
 * Map mode shipped for the United States and Canada drawing hand-written
 * placeholder polygons - Ontario was five points, a blob - while the questions,
 * ids and scoring were all correct. Everything passed: the round built, the
 * board rendered, the answer was checked. It was simply impossible to play,
 * because you cannot recognise Quebec from a pentagon.
 *
 * Nothing asserted that a region's outline resembled the place. These do.
 */

const COUNTRIES: CountryCode[] = ["JP", "US", "CA", "TH", "CN", "AU", "TW"];

/*
 * Only a country actually on offer has to be drawable. The others are held
 * back precisely because they are not, and this pairing is the thing that must
 * not drift: offering a country whose map is a set of blobs is the bug.
 */
const PLAYABLE = new Set<string>(getPlayableMapCountries(true).map((country) => country.code));

/** Drawing commands in a path, which is the crudest measure of detail there is. */
function vertexCount(path: string): number {
  return (path.match(/[MLHVCSQTAZ]/gi) ?? []).length;
}

/**
 * How much outline a region of a given size ought to have.
 *
 * A flat threshold is wrong at both ends: it fails the District of Columbia,
 * which is genuinely a four-mile diamond and honestly six points at this scale,
 * while passing a placeholder drawn large. What gives a blob away is being big
 * and simple at once - Ontario spanning a third of the canvas in five points.
 *
 * So the requirement scales with the space a region occupies. Anything smaller
 * than a few pixels across is exempt, because at that size there is nothing to
 * draw and nothing to recognise either.
 */
const EXEMPT_BELOW_PIXELS = 8;
const MINIMUM_VERTICES = 12;

describe("map geometry", () => {
  it.each(COUNTRIES)("%s has every region it claims", (country) => {
    expect(GEO_DATASETS[country].regions).toHaveLength(GEO_REGION_COUNTS[country as GameMapCountry]);
  });

  it.each(COUNTRIES)("%s gives every region a drawable outline", (country) => {
    for (const region of GEO_DATASETS[country].regions) {
      expect(region.map.path.length, `${country} ${region.code} has no path`).toBeGreaterThan(0);
      expect(region.map.path.startsWith("M"), `${country} ${region.code}`).toBe(true);
    }
  });

  it.each(COUNTRIES)("%s is only offered when it draws real boundaries", (country) => {
    const tooSimple = GEO_DATASETS[country].regions
      .filter((region) => {
        const [minX, minY, maxX, maxY] = region.map.bbox;
        const span = Math.max(maxX - minX, maxY - minY);
        if (span < EXEMPT_BELOW_PIXELS) return false;
        return vertexCount(region.map.path) < MINIMUM_VERTICES;
      })
      .map((region) => `${region.code} (${vertexCount(region.map.path)} points)`);

    if (PLAYABLE.has(country)) {
      expect(
        tooSimple,
        `${country} is offered in the lobby but its outlines are blobs. Regenerate the map from real geodata, or take it out of MAP_COUNTRIES.`,
      ).toEqual([]);
    } else {
      // Held back on purpose. If this fails, the map got better - offer it.
      expect(
        tooSimple.length,
        `${country} now has real outlines. Set playable: true in mapCountries.ts.`,
      ).toBeGreaterThan(0);
    }
  });

  it.each(COUNTRIES)("%s keeps every region inside its own canvas", (country) => {
    const dataset = GEO_DATASETS[country];
    for (const region of dataset.regions) {
      const [minX, minY, maxX, maxY] = region.map.bbox;
      expect(minX, `${country} ${region.code}`).toBeGreaterThanOrEqual(-1);
      expect(minY, `${country} ${region.code}`).toBeGreaterThanOrEqual(-1);
      expect(maxX, `${country} ${region.code}`).toBeLessThanOrEqual(dataset.width + 1);
      expect(maxY, `${country} ${region.code}`).toBeLessThanOrEqual(dataset.height + 1);
    }
  });

  it.each(COUNTRIES)("%s gives every region neighbours to draw distractors from", (country) => {
    const orphans = GEO_DATASETS[country].regions
      .filter((region) => region.map.neighbors.length === 0)
      .map((region) => String(region.code));

    /*
     * An island may genuinely border nothing, so this is not zero - but a whole
     * country of orphans means the distractors fall back to distance alone and
     * the wrong answers stop being its neighbours.
     */
    expect(orphans.length, `${country}: ${orphans.join(", ")}`).toBeLessThan(
      GEO_DATASETS[country].regions.length / 2,
    );
  });
});
