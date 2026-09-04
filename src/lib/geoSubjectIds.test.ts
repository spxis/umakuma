import { describe, expect, it } from "vitest";

/* Registers all seven; nothing is in memory until something loads it. */
import "./geoDatasetsAll";

import { getGeoRegionsByCountry } from "./geoRegion";
import {
  GEO_REGION_COUNTS,
  GEO_SUBJECT_ID_BASES,
  geoRegionIdFromSubjectId,
  geoSubjectId,
  isGeoSubjectId,
  type GameMapCountry,
} from "./geoSubjectIds";
import { isMapSubjectId, mapSubjectId } from "./japanPrefectures";


/* The countries the game reserves id ranges for - not every country with a map. */
const COUNTRIES: GameMapCountry[] = ["JP", "US", "CA", "TH", "CN", "AU", "TW"];

describe("backward compatibility with recorded runs", () => {
  /*
   * Runs played before the other countries existed hold ids from the original
   * Japan-only scheme. If this drifts, historical map runs stop resolving and
   * their scoreboards go blank.
   */
  it("gives every prefecture the id the original scheme gave it", () => {
    for (const region of getGeoRegionsByCountry("JP")) {
      expect(geoSubjectId("JP", region.code)).toBe(mapSubjectId(Number(region.code)));
    }
  });

  it("keeps the other countries clear of the range Japan already claimed", () => {
    for (const country of ["US", "CA", "TH", "CN", "AU", "TW"] as const) {
      for (const region of getGeoRegionsByCountry(country)) {
        expect(isMapSubjectId(geoSubjectId(country, region.code) as number)).toBe(false);
      }
    }
  });
});

describe("geoSubjectId", () => {
  /*
   * An id for every region the game can ask about, and none for the rest.
   *
   * A run stores its questions as these ids, so a country joins the scheme
   * only when somebody assigns it a range. The twenty-five countries opened
   * for reading have maps and no ids, and that is the correct answer rather
   * than a gap - `geoSubjectId` returns null instead of inventing one.
   */
  it("assigns an id to every region of a country the game can play", () => {
    for (const country of COUNTRIES) {
      for (const region of getGeoRegionsByCountry(country)) {
        expect(geoSubjectId(region.country, region.code)).not.toBeNull();
      }
    }
  });

  it("gives no id to a country the game has no range for", () => {
    for (const region of getGeoRegionsByCountry("FR")) {
      expect(geoSubjectId(region.country, region.code)).toBeNull();
    }
  });

  it("never collides across the whole pool", () => {
    const ids = COUNTRIES.flatMap((country) =>
      getGeoRegionsByCountry(country).map((region) => geoSubjectId(region.country, region.code)),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("returns null for a code its country does not have", () => {
    expect(geoSubjectId("US", "ZZ")).toBeNull();
    expect(geoSubjectId("JP", 999)).toBeNull();
  });
});

describe("geoRegionIdFromSubjectId", () => {
  it("round-trips every region back to its composite id", () => {
    /* Only the countries with a reserved range have ids to round-trip. */
    for (const country of COUNTRIES) {
      for (const region of getGeoRegionsByCountry(country)) {
        const id = geoSubjectId(region.country, region.code) as number;
        expect(geoRegionIdFromSubjectId(id)).toBe(region.id);
      }
    }
  });

  it("rejects a real WaniKani subject id", () => {
    expect(geoRegionIdFromSubjectId(440)).toBeNull();
    expect(isGeoSubjectId(440)).toBe(false);
  });

  it("rejects the bare base of each band, which names no region", () => {
    for (const country of COUNTRIES) {
      expect(geoRegionIdFromSubjectId(GEO_SUBJECT_ID_BASES[country])).toBeNull();
    }
  });
});

describe("the counts the id scheme depends on", () => {
  /*
   * US and Canada offsets come from each code's position in its sorted list, so
   * adding a division would renumber everything after it. This fails first if
   * that ever happens.
   */
  it.each(COUNTRIES)("still has the expected number of divisions for %s", (country) => {
    expect(getGeoRegionsByCountry(country)).toHaveLength(GEO_REGION_COUNTS[country as GameMapCountry]);
  });
});
