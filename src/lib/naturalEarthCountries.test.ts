import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { MAPPED_COUNTRIES_COPY } from "@/app/sources/Sources.constants";

import {
  NATURAL_EARTH_COUNTRIES,
  NATURAL_EARTH_TOTAL_BORDERS,
  NATURAL_EARTH_TOTAL_COUNTRIES,
  NATURAL_EARTH_TOTAL_REGIONS,
  naturalEarthTierCount,
} from "./naturalEarthCountries";

type MapFile = { regions: Array<{ code: string | number; neighbours?: string[]; neighbors?: string[] }> };

const loadMap = (code: string): MapFile =>
  JSON.parse(readFileSync(join(process.cwd(), `src/data/maps/${code.toLowerCase()}-map.json`), "utf8")) as MapFile;

const borderPairs = (map: MapFile) => {
  const pairs = new Set<string>();
  for (const region of map.regions) {
    for (const neighbour of region.neighbours ?? region.neighbors ?? []) {
      pairs.add([String(region.code), String(neighbour)].sort().join("~"));
    }
  }
  return pairs.size;
};

/*
 * The manifest is what the accreditation page counts from.
 *
 * Those three figures were literals - 1244 regions, 30 countries, 2591 borders
 * - typed onto the one page whose whole job is to say truthfully what we hold
 * from whom, while the sums that produce them sat exported and unused two files
 * away. They were right on the day; nothing would have said so the day after.
 *
 * Checked against the datasets themselves, so adding a country to the manifest
 * without its data, or rebuilding the data without the manifest, fails here.
 */
describe("the Natural Earth manifest", () => {
  it("counts the regions each dataset actually holds", () => {
    for (const country of NATURAL_EARTH_COUNTRIES) {
      expect({ code: country.code, regions: loadMap(country.code).regions.length }).toEqual({
        code: country.code,
        regions: country.regions,
      });
    }
  });

  it("counts each bordering pair once", () => {
    for (const country of NATURAL_EARTH_COUNTRIES) {
      expect({ code: country.code, borders: borderPairs(loadMap(country.code)) }).toEqual({
        code: country.code,
        borders: country.borders,
      });
    }
  });

  it("totals what the report prints", () => {
    expect(NATURAL_EARTH_TOTAL_COUNTRIES).toBe(NATURAL_EARTH_COUNTRIES.length);
    expect(NATURAL_EARTH_TOTAL_REGIONS).toBe(
      NATURAL_EARTH_COUNTRIES.reduce((sum, country) => sum + country.regions, 0),
    );
    expect(NATURAL_EARTH_TOTAL_BORDERS).toBe(
      NATURAL_EARTH_COUNTRIES.reduce((sum, country) => sum + country.borders, 0),
    );
  });

  it("sorts every country into exactly one tier", () => {
    const counted = naturalEarthTierCount("public") + naturalEarthTierCount("pilot") + naturalEarthTierCount("catalog");
    expect(counted).toBe(NATURAL_EARTH_TOTAL_COUNTRIES);
  });

  it("keeps the catalogue countries out of the loaded set", () => {
    /*
     * Built and committed, deliberately not imported: loading all thirty would
     * pull 6.7 MB of geometry into the bundle for maps nobody can open yet.
     */
    const loaded = readFileSync(join(process.cwd(), "src/lib/geoRegion.ts"), "utf8");
    for (const country of NATURAL_EARTH_COUNTRIES.filter((entry) => entry.tier === "catalog")) {
      expect(loaded).not.toContain(`@/data/maps/${country.code.toLowerCase()}-map.json`);
    }
  });
});

/* Canadian spelling, and no tier named twice. */
describe("the mapped-countries copy", () => {
  it("spells catalogue the Canadian way", () => {
    expect(MAPPED_COUNTRIES_COPY.tierSummary.catalog).toBe("Catalogue");
    expect(MAPPED_COUNTRIES_COPY.tierBadge.catalog).toBe("Catalogue");
  });

  it("leaves no American spelling in the panel's own code", () => {
    /* Comments stripped: the one below the imports quotes the old wording. */
    const panel = readFileSync(join(process.cwd(), "src/app/sources/MappedCountriesSection.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(panel).not.toMatch(/\bCatalog\b/);
  });

  it("takes its numbers as arguments rather than spelling them out", () => {
    expect(MAPPED_COUNTRIES_COPY.worldLede(30)).toContain("30");
    expect(MAPPED_COUNTRIES_COPY.regionsOf(47, "Prefectures")).toBe("47 prefectures");
  });
});

/*
 * When we took the data, said honestly.
 *
 * The report read `caMeta.updatedAt` alone, and Canada's config is the one that
 * sets `skipMetaWrite` - so its meta keeps the date of the first pull while
 * every other dataset carries the date of the last. The page reported Aug 30
 * for maps brought in on Sep 4. On an accreditation page that is not a rounding
 * error; it is the wrong answer to the only question the page exists to answer.
 */
describe("the last-brought-in date", () => {
  const metaDate = (code: string): string =>
    (JSON.parse(readFileSync(join(process.cwd(), `src/data/maps/${code}-meta.json`), "utf8")) as { updatedAt?: string })
      .updatedAt ?? "";

  const loaded = ["ca", "th", "cn", "au", "tw"];

  it("is the newest of the datasets the build loads, not Canada's alone", () => {
    const newest = [...loaded.map(metaDate)].sort().at(-1);
    expect(newest).toBeTruthy();
    expect(newest! >= metaDate("ca")).toBe(true);
  });

  it("is read from every loaded meta by the report", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/sourcePage.ts"), "utf8");
    const naturalEarthBody = source.slice(source.indexOf("function naturalEarth"));
    for (const meta of ["caMeta", "thMeta", "cnMeta", "auMeta", "twMeta"]) {
      expect(naturalEarthBody).toContain(`${meta}.updatedAt`);
    }
  });
});
