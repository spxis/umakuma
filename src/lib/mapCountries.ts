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
  { code: "JP", label: "Japan", playable: true, adminOnly: false, source: SOURCE_KEYS.jpmap },
  { code: "US", label: "United States", playable: true, adminOnly: false, source: SOURCE_KEYS.usmap },
  { code: "CA", label: "Canada", playable: true, adminOnly: false, source: SOURCE_KEYS.worldmap },
  /* Admin mode pilot wave: Thailand, China, Australia, Taiwan */
  { code: "TH", label: "Thailand", playable: true, adminOnly: true, source: SOURCE_KEYS.worldmap },
  { code: "CN", label: "China", playable: true, adminOnly: true, source: SOURCE_KEYS.worldmap },
  { code: "AU", label: "Australia", playable: true, adminOnly: true, source: SOURCE_KEYS.worldmap },
  { code: "TW", label: "Taiwan", playable: true, adminOnly: true, source: SOURCE_KEYS.worldmap },
] as const;

/** Countries whose maps are public and playable by everyone. */
export const MAP_COUNTRIES = ALL_MAP_COUNTRIES.filter((country) => country.playable && !country.adminOnly);

/** Returns countries available to the player depending on admin privileges. */
export function getPlayableMapCountries(isAdmin = false) {
  return ALL_MAP_COUNTRIES.filter((country) => country.playable && (isAdmin || !country.adminOnly));
}

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
