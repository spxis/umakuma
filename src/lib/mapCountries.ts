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
   * Not offered yet, and the reason is the map rather than the code.
   *
   * Everything around these works - the questions, the ids, the scoring, the
   * board - but `us-map.json` and `ca-map.json` hold hand-written placeholder
   * polygons: Ontario is five points. You cannot recognise Quebec from a
   * pentagon, so offering it would be offering a game that cannot be played.
   *
   * `geoMapGeometry.test.ts` fails on exactly this. Flip these to true when
   * real outlines land and the test goes green.
   */
  { code: "US", label: "United States", playable: false },
  { code: "CA", label: "Canada", playable: false },
] as const;

/** Countries whose maps are real enough to play on. */
export const MAP_COUNTRIES = ALL_MAP_COUNTRIES.filter((country) => country.playable);

/** Every country the engine supports, playable or not. */
export const MAP_COUNTRIES_ALL = ALL_MAP_COUNTRIES;

export type MapCountryCode = (typeof ALL_MAP_COUNTRIES)[number]["code"];

export function isMapCountry(value: string): value is MapCountryCode {
  return ALL_MAP_COUNTRIES.some((country) => country.code === value);
}
