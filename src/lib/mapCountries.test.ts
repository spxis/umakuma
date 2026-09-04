import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { MAP_COUNTRY_SLUGS } from "./mapAddress";
import {
  MAP_COUNTRIES,
  isPlayableMapCountry,
  MAP_COUNTRIES_ALL,
  MAP_SOURCE_KEYS,
  canUseMapCountry,
  isMapCountry,
} from "./mapCountries";
import { SOURCE_CREDITS } from "./sourceCredits";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const PLAYABLE = ["JP", "US", "CA"];

/*
 * Three countries are playable and thirty are readable.
 *
 * They are different questions and they used to be one. The game reserves a
 * range of subject ids per country and writes them into every run it stores,
 * so a country joins the game when somebody assigns it a range - not when its
 * outlines arrive. Thailand, China, Australia and Taiwan were admin-only
 * pilots while they were the only generated countries; they are the same
 * Natural Earth data as the other twenty-five now open, so the four stopped
 * being a category.
 */
describe("playable and readable", () => {
  it("lets the game run on exactly Japan, the United States and Canada", () => {
    expect(MAP_COUNTRIES.map((country) => country.code)).toEqual(PLAYABLE);
    for (const code of PLAYABLE) expect(isPlayableMapCountry(code)).toBe(true);
  });

  it("refuses the game to a country with no reserved id range", () => {
    for (const code of ["FR", "TH", "BR", "TW"]) {
      expect(isPlayableMapCountry(code)).toBe(false);
    }
  });

  it("still lets anyone read those maps", () => {
    for (const code of ["FR", "TH", "BR", "TW"]) {
      expect(canUseMapCountry(code, false)).toBe(true);
    }
  });

  it("keeps nobody admin-only, now that the pilots are open", () => {
    expect(MAP_COUNTRIES_ALL.filter((country) => country.adminOnly)).toEqual([]);
  });

  it("says no to a country that is not on the map at all", () => {
    expect(isMapCountry("ZZ")).toBe(false);
    expect(canUseMapCountry("ZZ", true)).toBe(false);
    expect(isPlayableMapCountry("ZZ")).toBe(false);
  });
});

/*
 * The runs route asks the registry rather than repeating it.
 *
 * Written against the source because the failure was a second list that drifted
 * from the first, and a second list is exactly what a passing unit test would
 * not notice.
 */
describe("the runs route", () => {
  const source = read("src/app/api/game/[accountId]/runs/route.ts");

  it("validates mapCountry against playability, not merely against being real", () => {
    expect(source).toContain("mapCountry: z.string().refine(isPlayableMapCountry)");
    expect(source).not.toMatch(/mapCountry:\s*z\.enum\(/);
  });

  it("refuses a pilot country to a viewer who is not an admin", () => {
    expect(source).toContain("isAdminOnlyMapCountry");
    expect(source).toContain("isAuthorizedAdmin");
  });
});

/* Every country carries its own credit and its own address. */
describe("every country in the registry", () => {
  it("names a source that exists", () => {
    for (const country of MAP_COUNTRIES_ALL) {
      expect(SOURCE_CREDITS[MAP_SOURCE_KEYS[country.code]]).toBeDefined();
    }
  });

  it("has a slug, and a dataset behind it", () => {
    for (const country of MAP_COUNTRIES_ALL) {
      expect(MAP_COUNTRY_SLUGS[country.code]).toBeTruthy();
      expect(existsSync(join(process.cwd(), `src/data/maps/${country.code.toLowerCase()}-map.json`))).toBe(true);
    }
  });
});

/*
 * The component that draws them is CountryMap, and there is no second name.
 *
 * It was renamed by leaving a three-line JapanMap.tsx re-exporting it, and all
 * eight call sites stayed on the old name - so nothing imported the new one,
 * and a component called JapanMap drew Thailand.
 */
describe("the map component", () => {
  it("has no JapanMap left to import", () => {
    expect(existsSync(join(process.cwd(), "src/app/game/JapanMap.tsx"))).toBe(false);
  });
});
