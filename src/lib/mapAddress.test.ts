import { describe, expect, it } from "vitest";

import { GEO_DATASETS, type CountryCode } from "./geoRegion";
import { MAP_COUNTRY_SLUGS, countryForSlug, mapHref, parseMapPath, regionForSlug, regionSlug } from "./mapAddress";

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
        expect(parseMapPath(segments), href).toEqual({ country, code: region.code });
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
    expect(parseMapPath([])).toEqual({ country: "JP", code: null });
    expect(parseMapPath(undefined)).toEqual({ country: "JP", code: null });
    expect(parseMapPath(["canada"])).toEqual({ country: "CA", code: null });
  });

  it("refuses a path that names nothing real, rather than guessing", () => {
    expect(parseMapPath(["france"])).toBeNull();
    expect(parseMapPath(["japan", "atlantis"])).toBeNull();
    expect(parseMapPath(["japan", "gifu", "extra"])).toBeNull();
    expect(countryForSlug("JAPAN")).toBe("JP");
    expect(regionForSlug("JP", "GIFU")?.code).toBe(21);
    expect(MAP_COUNTRY_SLUGS.US).toBe("united-states");
  });
});
