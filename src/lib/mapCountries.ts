/**
 * Countries Map mode can play on, in the order the lobby offers them.
 *
 * Japan first and by default: it is what UmaKuma is for, and the rest are a
 * bonus. Adding Europe or Asia later means adding a dataset and a line here,
 * not a code path - which is why the country rides in the request rather than
 * being a separate game.
 *
 * `adminOnly` is a pilot, not a decoration. A country wearing it is one being
 * tried out before anyone else sees it, so every way in has to agree: the
 * lobby offers it only to an admin, the runs route refuses it for anyone else,
 * and /maps/<slug> is a 404 rather than a public page. It shipped as a label
 * on the lobby dropdown alone, which left the four pilot maps readable by
 * anybody who guessed the address and unplayable by the admin they were for.
 */
import { SOURCE_KEYS, type SourceKey } from "./sourceCredits";

/**
 * Where in the world each country is, for the picker to group by.
 *
 * A flat row of buttons was fine for three and unreadable by seven; it would
 * be unusable at thirty. Japan stands on its own outside these groups - it is
 * what the site is for - and everywhere else is reached through the part of
 * the world it is in.
 */
export const WORLD_PARTS = ["Asia", "Oceania", "North America", "South America", "Europe"] as const;
export type WorldPart = (typeof WORLD_PARTS)[number];

const ALL_MAP_COUNTRIES = [
  { code: "JP", label: "Japan", part: "Asia", playable: true, adminOnly: false, source: SOURCE_KEYS.jpmap },
  { code: "US", label: "United States", part: "North America", playable: true, adminOnly: false, source: SOURCE_KEYS.usmap },
  { code: "CA", label: "Canada", part: "North America", playable: true, adminOnly: false, source: SOURCE_KEYS.worldmap },
  /* Admin mode pilot wave: Thailand, China, Australia, Taiwan */
  { code: "TH", label: "Thailand", part: "Asia", playable: true, adminOnly: true, source: SOURCE_KEYS.worldmap },
  { code: "CN", label: "China", part: "Asia", playable: true, adminOnly: true, source: SOURCE_KEYS.worldmap },
  { code: "AU", label: "Australia", part: "Oceania", playable: true, adminOnly: true, source: SOURCE_KEYS.worldmap },
  { code: "TW", label: "Taiwan", part: "Asia", playable: true, adminOnly: true, source: SOURCE_KEYS.worldmap },
] as const;

/** The country the site is about, always offered on its own. */
export const HOME_MAP_COUNTRY = "JP";

/** Countries whose maps are public and playable by everyone. */
export const MAP_COUNTRIES = ALL_MAP_COUNTRIES.filter((country) => country.playable && !country.adminOnly);

/** Returns countries available to the player depending on admin privileges. */
export function getPlayableMapCountries(isAdmin = false) {
  return ALL_MAP_COUNTRIES.filter((country) => country.playable && (isAdmin || !country.adminOnly));
}

/** Whether the country is still a pilot, and so admin-only wherever it appears. */
export function isAdminOnlyMapCountry(code: string): boolean {
  return ALL_MAP_COUNTRIES.some((country) => country.code === code && country.adminOnly);
}

/**
 * The one question every entrance asks: may this viewer have this country?
 *
 * The lobby, the runs route and the map page each used to answer it their own
 * way, and the three answers disagreed.
 */
export function canUseMapCountry(code: string, isAdmin: boolean): boolean {
  return ALL_MAP_COUNTRIES.some(
    (country) => country.code === code && country.playable && (isAdmin || !country.adminOnly),
  );
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
 * Three rights holders across the countries we load, and only Japan's compels
 * anything. Keeping the answer here rather than in the map component means the
 * next country arrives with its credit attached, the way its dataset and its
 * label already do.
 */
export const MAP_SOURCE_KEYS: Record<MapCountryCode, SourceKey> = Object.fromEntries(
  ALL_MAP_COUNTRIES.map((country) => [country.code, country.source]),
) as Record<MapCountryCode, SourceKey>;

export type MapCountryEntry = (typeof ALL_MAP_COUNTRIES)[number];

/**
 * The countries a viewer may open, split into Japan and everywhere else.
 *
 * Everywhere else is grouped by part of the world and each group is dropped
 * when it is empty, so a viewer who may see only the public maps is offered
 * "North America" and nothing else rather than four headings with one country
 * between them.
 */
export function mapCountryGroups(isAdmin = false): { home: MapCountryEntry; parts: { part: WorldPart; countries: MapCountryEntry[] }[] } {
  const available = getPlayableMapCountries(isAdmin);
  const home = available.find((country) => country.code === HOME_MAP_COUNTRY) ?? available[0]!;
  const parts = WORLD_PARTS.map((part) => ({
    part,
    countries: available.filter((country) => country.part === part && country.code !== home.code),
  })).filter((group) => group.countries.length > 0);
  return { home, parts };
}
