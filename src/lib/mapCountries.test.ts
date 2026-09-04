import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { MAP_COUNTRY_SLUGS } from "./mapAddress";
import {
  MAP_COUNTRIES,
  MAP_COUNTRIES_ALL,
  MAP_SOURCE_KEYS,
  canUseMapCountry,
  getPlayableMapCountries,
  isAdminOnlyMapCountry,
  isMapCountry,
} from "./mapCountries";
import { SOURCE_CREDITS } from "./sourceCredits";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const PILOTS = ["TH", "CN", "AU", "TW"];
const PUBLIC = ["JP", "US", "CA"];

/*
 * A pilot country is admin-only at every entrance, or it is not a pilot.
 *
 * It shipped as a label on one dropdown. That left the four pilot maps readable
 * by anyone who typed /maps/thailand, and unplayable by the admin they were
 * for: the runs route still carried a literal ["JP","US","CA"], so every pilot
 * start came back "Could not start the game". Three entrances, three different
 * answers to one question - hence one predicate, asked by all three.
 */
describe("the pilot countries", () => {
  it("are the four the lobby marks as a pilot", () => {
    expect(MAP_COUNTRIES_ALL.filter((country) => country.adminOnly).map((country) => country.code).sort()).toEqual(
      [...PILOTS].sort(),
    );
  });

  it("are kept out of the public list", () => {
    expect(MAP_COUNTRIES.map((country) => country.code)).toEqual(PUBLIC);
    for (const code of PILOTS) expect(isAdminOnlyMapCountry(code)).toBe(true);
    for (const code of PUBLIC) expect(isAdminOnlyMapCountry(code)).toBe(false);
  });

  it("are offered to an admin and to nobody else", () => {
    expect(getPlayableMapCountries(false).map((country) => country.code)).toEqual(PUBLIC);
    expect(getPlayableMapCountries(true).map((country) => country.code)).toEqual([...PUBLIC, ...PILOTS]);
  });

  it("answer canUseMapCountry the same way the lobby lists them", () => {
    for (const code of PILOTS) {
      expect(canUseMapCountry(code, true)).toBe(true);
      expect(canUseMapCountry(code, false)).toBe(false);
    }
    for (const code of PUBLIC) {
      expect(canUseMapCountry(code, false)).toBe(true);
      expect(canUseMapCountry(code, true)).toBe(true);
    }
  });

  it("say no to a country that is not on the map at all", () => {
    expect(isMapCountry("ZZ")).toBe(false);
    expect(canUseMapCountry("ZZ", true)).toBe(false);
    expect(isAdminOnlyMapCountry("ZZ")).toBe(false);
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

  it("validates mapCountry against the registry, not a literal list", () => {
    expect(source).toContain("mapCountry: z.string().refine(isMapCountry)");
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
