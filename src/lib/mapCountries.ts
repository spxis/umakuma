/**
 * Countries Map mode can play on, in the order the lobby offers them.
 *
 * Japan first and by default: it is what UmaKuma is for, and the other two are
 * a bonus. Adding Europe or Asia later means adding a dataset and a line here,
 * not a code path - which is why the country rides in the request rather than
 * being a separate game.
 */
const ALL_MAP_COUNTRIES = [
  { code: "JP", label: "Japan", playable: true },
  /*
   * Offered since their maps became real: built by `pnpm map:build:us` and
   * `pnpm map:build:canada` from the Census Bureau and Natural Earth rather
   * than the hand-written pentagons that stood in before.
   * `geoMapGeometry.test.ts` holds them to it.
   */
  { code: "US", label: "United States", playable: true },
  { code: "CA", label: "Canada", playable: true },
] as const;

/** Countries whose maps are real enough to play on. */
export const MAP_COUNTRIES = ALL_MAP_COUNTRIES.filter((country) => country.playable);

/** Every country the engine supports, playable or not. */
export const MAP_COUNTRIES_ALL = ALL_MAP_COUNTRIES;

export type MapCountryCode = (typeof ALL_MAP_COUNTRIES)[number]["code"];

export function isMapCountry(value: string): value is MapCountryCode {
  return ALL_MAP_COUNTRIES.some((country) => country.code === value);
}
