import { getGeoRegionsByCountry, type CountryCode } from "./geoRegion";
import { MAP_SUBJECT_ID_BASE } from "./japanPrefectures";

/**
 * Reserved subject ids for map regions, extended to the three countries.
 *
 * Map regions are not WaniKani subjects, but they ride the run/question/answer
 * tables so scoring, streaks and the scoreboard need no map-specific paths.
 * That works because their ids sit in a reserved range far above any real
 * subject id.
 *
 * Japan keeps the range it already has, `MAP_SUBJECT_ID_BASE + code`, because
 * runs recorded before the other countries existed hold those exact numbers and
 * must keep resolving. The US and Canada get their own bands well clear of
 * Japan's 47, so no historical id changes meaning.
 *
 * Japan's offset is its own numeric code. The US and Canada use two-letter
 * codes, so their offset is the position of the code in its country's sorted
 * list, plus one. That is stable because the set of states and provinces is
 * fixed; if one were ever added, ids after it would shift, so `geoRegionCount`
 * is pinned by a test to make that break loudly rather than silently.
 */
/**
 * The countries the map game can run on.
 *
 * Narrower than `CountryCode`, deliberately: every run stores its questions as
 * subject ids drawn from these ranges, so a country only joins the game when
 * somebody assigns it a range - which is a decision about data that outlives
 * the code, not a line of layout.
 */
export type GameMapCountry = "JP" | "US" | "CA" | "TH" | "CN" | "AU" | "TW";

export const GEO_SUBJECT_ID_BASES: Record<GameMapCountry, number> = {
  JP: MAP_SUBJECT_ID_BASE,
  US: MAP_SUBJECT_ID_BASE + 1_000,
  CA: MAP_SUBJECT_ID_BASE + 2_000,
  TH: MAP_SUBJECT_ID_BASE + 3_000,
  CN: MAP_SUBJECT_ID_BASE + 4_000,
  AU: MAP_SUBJECT_ID_BASE + 5_000,
  TW: MAP_SUBJECT_ID_BASE + 6_000,
};

/** How many divisions each country has; ids are only stable while these hold. */
export const GAME_MAP_COUNTRIES = ["JP", "US", "CA", "TH", "CN", "AU", "TW"] as const;

/** Whether the map game has a reserved id range for this country. */
export function isGameMapCountry(code: string): code is GameMapCountry {
  return (GAME_MAP_COUNTRIES as readonly string[]).includes(code);
}

export const GEO_REGION_COUNTS: Record<GameMapCountry, number> = {
  JP: 47,
  US: 51,
  CA: 13,
  TH: 77,
  CN: 31,
  AU: 10,
  TW: 21,
};

const COUNTRY_CODES = Object.keys(GEO_SUBJECT_ID_BASES) as GameMapCountry[];

function sortedCodesFor(country: CountryCode): string[] {
  return getGeoRegionsByCountry(country)
    .map((region) => String(region.code))
    .sort((left, right) => left.localeCompare(right));
}

/**
 * A country's offsets, built the first time they can be.
 *
 * Built once at module load before, which was wrong in a way nothing caught: a
 * country's regions are registered when its dataset chunk lands, and this
 * module is imported long before any of them. So every map was built from an
 * empty region list and cached that way for the life of the page - `geoSubjectId`
 * returned null for every region and `geoRegionIdFromSubjectId` could not name
 * a single id, while `isGeoSubjectId` (which reads the pinned counts and no
 * dataset) went on answering true.
 *
 * What that looked like: the map game drew the prompt, drew the country, and
 * offered nothing to answer with. `CountryMap` loads its own dataset through
 * `useGeoDataset` and redrew when it landed; the option handles were built from
 * this cache and stayed empty forever.
 *
 * An empty result is never cached, so the first call after the dataset lands
 * builds the real map. The unit tests missed it because the suite imports the
 * datasets before this module, which is the one order the browser never uses.
 */
const OFFSETS_BY_COUNTRY = new Map<CountryCode, Map<string, number>>();

function offsetsFor(country: CountryCode): Map<string, number> {
  const cached = OFFSETS_BY_COUNTRY.get(country);
  if (cached) return cached;

  const built =
    country === "JP"
      ? // Japan's offset is the prefecture code itself, which the original
        // scheme used and historical runs already hold.
        new Map(getGeoRegionsByCountry(country).map((region) => [String(region.code), Number(region.code)]))
      : new Map(sortedCodesFor(country).map((code, index) => [code, index + 1]));

  /* Only a real answer is kept: an empty one means the dataset has not landed
     yet, and caching it is exactly what broke the board. */
  if (built.size > 0) OFFSETS_BY_COUNTRY.set(country, built);
  return built;
}

/** The reserved subject id for a region, given its country and code. */
export function geoSubjectId(country: CountryCode, code: string | number): number | null {
  /* A country the game has no id range for has no subject id, by definition. */
  if (!isGameMapCountry(country)) return null;
  const offset = offsetsFor(country).get(String(code));
  return offset === undefined ? null : GEO_SUBJECT_ID_BASES[country] + offset;
}

/** Whether an id falls in any country's reserved map band. */
export function isGeoSubjectId(subjectId: number): boolean {
  /* Only the countries with a reserved range can own one of these ids. */
  return GAME_MAP_COUNTRIES.some((country) => {
    const offset = subjectId - GEO_SUBJECT_ID_BASES[country];
    return offset >= 1 && offset <= GEO_REGION_COUNTS[country];
  });
}

/** The composite region id (`"US-CA"`) an id refers to, or null if it is not a map id. */
export function geoRegionIdFromSubjectId(subjectId: number): string | null {
  for (const country of COUNTRY_CODES) {
    const offset = subjectId - GEO_SUBJECT_ID_BASES[country];
    if (offset < 1 || offset > GEO_REGION_COUNTS[country]) {
      continue;
    }

    for (const [code, candidate] of offsetsFor(country)) {
      if (candidate === offset) {
        return `${country}-${code}`;
      }
    }
  }

  return null;
}

/**
 * Which country a reserved map id belongs to, from the id alone.
 *
 * Reads the pinned counts and nothing else, so it works on the server with no
 * dataset loaded - unlike `geoRegionIdFromSubjectId`, which needs the region
 * list to name the division. Answering "which country was this run played on"
 * only needs the band, and asking that of a finished run's stored ids is how
 * the map clear bonus knows which country it has to have covered.
 */
export function geoCountryFromSubjectId(subjectId: number): GameMapCountry | null {
  return (
    GAME_MAP_COUNTRIES.find((country) => {
      const offset = subjectId - GEO_SUBJECT_ID_BASES[country];
      return offset >= 1 && offset <= GEO_REGION_COUNTS[country];
    }) ?? null
  );
}
