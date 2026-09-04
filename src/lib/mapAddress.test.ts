import { describe, expect, it } from "vitest";

import { GEO_DATASETS, type CountryCode } from "./geoRegion";
import {
  MAP_COUNTRY_SLUGS,
  areaForSlug,
  areaSlug,
  countryForSlug,
  mapHref,
  parseMapPath,
  regionForSlug,
  regionSlug,
} from "./mapAddress";
import { areasOf, regionCodesInArea } from "./mapDirectory";

const COUNTRIES: CountryCode[] = ["JP", "US", "CA"];

describe("a map's address", () => {
  it("names a country and a region in the path", () => {
    expect(mapHref("JP", null)).toBe("/maps/japan");
    expect(mapHref("JP", 21)).toBe("/maps/japan/gifu");
    expect(mapHref("US", "CA")).toBe("/maps/united-states/california");
    expect(mapHref("CA", "NT")).toBe("/maps/canada/northwest-territories");
  });

  it("reads every one of them back", () => {
    for (const country of COUNTRIES) {
      for (const region of GEO_DATASETS[country].regions) {
        const href = mapHref(country, region.code);
        const segments = href.replace("/maps/", "").split("/");
        expect(parseMapPath(segments), href).toEqual({ country, area: null, code: region.code });
      }
    }
  });

  /* The slug is the address, so two regions sharing one would hide a place. */
  it("gives every region in a country its own name", () => {
    for (const country of COUNTRIES) {
      const slugs = GEO_DATASETS[country].regions.map(regionSlug);
      expect(new Set(slugs).size, country).toBe(slugs.length);
      expect(slugs.every((slug) => /^[a-z0-9-]+$/.test(slug)), country).toBe(true);
    }
  });

  it("opens Japan when the path names nothing", () => {
    expect(parseMapPath([])).toEqual({ country: "JP", area: null, code: null });
    expect(parseMapPath(undefined)).toEqual({ country: "JP", area: null, code: null });
    expect(parseMapPath(["canada"])).toEqual({ country: "CA", area: null, code: null });
  });

  it("refuses a path that names nothing real, rather than guessing", () => {
    expect(parseMapPath(["atlantis"])).toBeNull();
    expect(parseMapPath(["japan", "atlantis"])).toBeNull();
    expect(parseMapPath(["japan", "gifu", "extra"])).toBeNull();
    expect(countryForSlug("JAPAN")).toBe("JP");
    expect(regionForSlug("JP", "GIFU")?.code).toBe(21);
    expect(MAP_COUNTRY_SLUGS.US).toBe("united-states");
  });
});

/**
 * A region - Tohoku, the Prairies - in the address, under an explicit word.
 *
 * The word is there because Japan has a region and a prefecture both called
 * Hokkaido, and again Okinawa: `/maps/japan/hokkaido` cannot mean both, so a
 * bare slug would have needed a Japan-only rule. The marker makes every
 * country read the same way.
 */
describe("a region in the address", () => {
  it("names a region, and a province chosen within one", () => {
    expect(mapHref("CA", null, "West Coast")).toBe("/maps/canada/region/west-coast");
    expect(mapHref("CA", "BC", "West Coast")).toBe("/maps/canada/region/west-coast/british-columbia");
    expect(mapHref("JP", 2, "Tohoku")).toBe("/maps/japan/region/tohoku/aomori");
    /* A province alone is unchanged. */
    expect(mapHref("CA", "BC")).toBe("/maps/canada/british-columbia");
  });

  it("tells the Hokkaido region from the Hokkaido prefecture", () => {
    expect(parseMapPath(["japan", "hokkaido"])).toEqual({ country: "JP", area: null, code: 1 });
    expect(parseMapPath(["japan", "region", "hokkaido"])).toEqual({ country: "JP", area: "Hokkaido", code: null });
    expect(parseMapPath(["japan", "region", "okinawa", "okinawa"])).toEqual({ country: "JP", area: "Okinawa", code: 47 });
  });

  it("reads every region, and every province within one, back", () => {
    for (const country of COUNTRIES) {
      const regions = GEO_DATASETS[country].regions;
      for (const area of areasOf(regions)) {
        const alone = mapHref(country, null, area).replace("/maps/", "").split("/");
        expect(parseMapPath(alone), area).toEqual({ country, area, code: null });
        for (const code of regionCodesInArea(regions, area)) {
          const within = mapHref(country, code, area).replace("/maps/", "").split("/");
          expect(parseMapPath(within), `${area} / ${code}`).toEqual({ country, area, code });
        }
      }
    }
  });

  it("gives every region in a country its own slug", () => {
    for (const country of COUNTRIES) {
      const slugs = areasOf(GEO_DATASETS[country].regions).map(areaSlug);
      expect(new Set(slugs).size, country).toBe(slugs.length);
      expect(areaForSlug(country, slugs[0])).not.toBeNull();
    }
  });

  /* The address makes a claim about the map; a false one does not open. */
  it("refuses a province under a region it is not in", () => {
    expect(parseMapPath(["canada", "region", "prairies", "ontario"])).toBeNull();
    expect(parseMapPath(["canada", "region", "atlantis"])).toBeNull();
    expect(parseMapPath(["canada", "region", "prairies", "alberta", "extra"])).toBeNull();
    expect(parseMapPath(["canada", "region"])).toBeNull();
  });

  it("drops a region the province is not in rather than writing a false address", () => {
    expect(mapHref("CA", "ON", "Prairies")).toBe("/maps/canada/ontario");
  });
});
