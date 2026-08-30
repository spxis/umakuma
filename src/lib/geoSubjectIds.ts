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
export const GEO_SUBJECT_ID_BASES: Record<CountryCode, number> = {
  JP: MAP_SUBJECT_ID_BASE,
  US: MAP_SUBJECT_ID_BASE + 1_000,
  CA: MAP_SUBJECT_ID_BASE + 2_000,
};

/** How many divisions each country has; ids are only stable while these hold. */
export const GEO_REGION_COUNTS: Record<CountryCode, number> = { JP: 47, US: 51, CA: 13 };

const COUNTRY_CODES = Object.keys(GEO_SUBJECT_ID_BASES) as CountryCode[];

function sortedCodesFor(country: CountryCode): string[] {
  return getGeoRegionsByCountry(country)
    .map((region) => String(region.code))
    .sort((left, right) => left.localeCompare(right));
}

const OFFSETS_BY_COUNTRY = new Map<CountryCode, Map<string, number>>(
  COUNTRY_CODES.map((country) => {
    if (country === "JP") {
      // Japan's offset is the prefecture code itself, which the original scheme
      // used and historical runs already hold.
      return [
        country,
        new Map(getGeoRegionsByCountry(country).map((region) => [String(region.code), Number(region.code)])),
      ];
    }

    return [country, new Map(sortedCodesFor(country).map((code, index) => [code, index + 1]))];
  }),
);

/** The reserved subject id for a region, given its country and code. */
export function geoSubjectId(country: CountryCode, code: string | number): number | null {
  const offset = OFFSETS_BY_COUNTRY.get(country)?.get(String(code));
  return offset === undefined ? null : GEO_SUBJECT_ID_BASES[country] + offset;
}

/** Whether an id falls in any country's reserved map band. */
export function isGeoSubjectId(subjectId: number): boolean {
  return COUNTRY_CODES.some((country) => {
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

    for (const [code, candidate] of OFFSETS_BY_COUNTRY.get(country) ?? []) {
      if (candidate === offset) {
        return `${country}-${code}`;
      }
    }
  }

  return null;
}
