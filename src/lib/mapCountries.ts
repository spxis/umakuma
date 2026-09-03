/**
 * Countries Map mode can play on, in the order the lobby offers them.
 *
 * Japan first and by default: it is what UmaKuma is for, and the other two are
 * a bonus. Adding Europe or Asia later means adding a dataset and a line here,
 * not a code path - which is why the country rides in the request rather than
 * being a separate game.
 */
import { SOURCE_KEYS, type SourceKey } from "./sourceCredits";

const ALL_MAP_COUNTRIES = [
  { code: "JP", label: "Japan", playable: true, source: SOURCE_KEYS.jpmap },
  /*
   * Offered since their maps became real: built by `pnpm map:build:us` and
   * `pnpm map:build:canada` from the Census Bureau and Natural Earth rather
   * than the hand-written pentagons that stood in before.
   * `geoMapGeometry.test.ts` holds them to it.
   */
  { code: "US", label: "United States", playable: true, source: SOURCE_KEYS.usmap },
  { code: "CA", label: "Canada", playable: true, source: SOURCE_KEYS.camap },
] as const;

/** Countries whose maps are real enough to play on. */
export const MAP_COUNTRIES = ALL_MAP_COUNTRIES.filter((country) => country.playable);

/** Every country the engine supports, playable or not. */
export const MAP_COUNTRIES_ALL = ALL_MAP_COUNTRIES;

export type MapCountryCode = (typeof ALL_MAP_COUNTRIES)[number]["code"];

export function isMapCountry(value: string): value is MapCountryCode {
  return ALL_MAP_COUNTRIES.some((country) => country.code === value);
}

/**
 * Whose outlines each board is drawing.
 *
 * Three countries, three rights holders, three sets of terms - and only Japan's
 * compels anything. Keeping the answer here rather than in the map component
 * means a fourth country arrives with its credit attached, the way its dataset
 * and its label already do.
 */
export const MAP_SOURCE_KEYS: Record<MapCountryCode, SourceKey> = Object.fromEntries(
  ALL_MAP_COUNTRIES.map((country) => [country.code, country.source]),
) as Record<MapCountryCode, SourceKey>;
