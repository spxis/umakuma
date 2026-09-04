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
  { code: "JP", label: "Japan", part: "Asia", curated: true, playable: true, adminOnly: false, source: SOURCE_KEYS.jpmap },
  { code: "US", label: "United States", part: "North America", curated: true, playable: true, adminOnly: false, source: SOURCE_KEYS.usmap },
  { code: "CA", label: "Canada", part: "North America", curated: true, playable: true, adminOnly: false, source: SOURCE_KEYS.worldmap },
  /* Admin mode pilot wave: Thailand, China, Australia, Taiwan */
  { code: "TH", curated: false, label: "Thailand", part: "Asia", playable: true, adminOnly: true, source: SOURCE_KEYS.worldmap },
  { code: "CN", curated: false, label: "China", part: "Asia", playable: true, adminOnly: true, source: SOURCE_KEYS.worldmap },
  { code: "AU", curated: false, label: "Australia", part: "Oceania", playable: true, adminOnly: true, source: SOURCE_KEYS.worldmap },
  { code: "TW", curated: false, label: "Taiwan", part: "Asia", playable: true, adminOnly: true, source: SOURCE_KEYS.worldmap },
  /*
   * The rest of Natural Earth's thirty, public.
   *
   * Their outlines, their region names and their cities are true; their
   * capitals come from Populated Places where it marks one. Nothing else is
   * shown for them, because nothing else is known - see `isCuratedMapCountry`.
   */
  { code: "MX", label: "Mexico", part: "North America", curated: false, playable: false, adminOnly: false, source: SOURCE_KEYS.worldmap },
  { code: "AR", label: "Argentina", part: "South America", curated: false, playable: false, adminOnly: false, source: SOURCE_KEYS.worldmap },
  { code: "BR", label: "Brazil", part: "South America", curated: false, playable: false, adminOnly: false, source: SOURCE_KEYS.worldmap },
  { code: "CL", label: "Chile", part: "South America", curated: false, playable: false, adminOnly: false, source: SOURCE_KEYS.worldmap },
  { code: "CO", label: "Colombia", part: "South America", curated: false, playable: false, adminOnly: false, source: SOURCE_KEYS.worldmap },
  { code: "PE", label: "Peru", part: "South America", curated: false, playable: false, adminOnly: false, source: SOURCE_KEYS.worldmap },
  { code: "AT", label: "Austria", part: "Europe", curated: false, playable: false, adminOnly: false, source: SOURCE_KEYS.worldmap },
  { code: "BE", label: "Belgium", part: "Europe", curated: false, playable: false, adminOnly: false, source: SOURCE_KEYS.worldmap },
  { code: "CH", label: "Switzerland", part: "Europe", curated: false, playable: false, adminOnly: false, source: SOURCE_KEYS.worldmap },
  { code: "DE", label: "Germany", part: "Europe", curated: false, playable: false, adminOnly: false, source: SOURCE_KEYS.worldmap },
  { code: "ES", label: "Spain", part: "Europe", curated: false, playable: false, adminOnly: false, source: SOURCE_KEYS.worldmap },
  { code: "FR", label: "France", part: "Europe", curated: false, playable: false, adminOnly: false, source: SOURCE_KEYS.worldmap },
  { code: "GB", label: "United Kingdom", part: "Europe", curated: false, playable: false, adminOnly: false, source: SOURCE_KEYS.worldmap },
  { code: "IE", label: "Ireland", part: "Europe", curated: false, playable: false, adminOnly: false, source: SOURCE_KEYS.worldmap },
  { code: "IT", label: "Italy", part: "Europe", curated: false, playable: false, adminOnly: false, source: SOURCE_KEYS.worldmap },
  { code: "NL", label: "Netherlands", part: "Europe", curated: false, playable: false, adminOnly: false, source: SOURCE_KEYS.worldmap },
  { code: "NO", label: "Norway", part: "Europe", curated: false, playable: false, adminOnly: false, source: SOURCE_KEYS.worldmap },
  { code: "PL", label: "Poland", part: "Europe", curated: false, playable: false, adminOnly: false, source: SOURCE_KEYS.worldmap },
  { code: "RU", label: "Russia", part: "Europe", curated: false, playable: false, adminOnly: false, source: SOURCE_KEYS.worldmap },
  { code: "SE", label: "Sweden", part: "Europe", curated: false, playable: false, adminOnly: false, source: SOURCE_KEYS.worldmap },
  { code: "KR", label: "South Korea", part: "Asia", curated: false, playable: false, adminOnly: false, source: SOURCE_KEYS.worldmap },
  { code: "MY", label: "Malaysia", part: "Asia", curated: false, playable: false, adminOnly: false, source: SOURCE_KEYS.worldmap },
  { code: "PH", label: "Philippines", part: "Asia", curated: false, playable: false, adminOnly: false, source: SOURCE_KEYS.worldmap },
  { code: "VN", label: "Vietnam", part: "Asia", curated: false, playable: false, adminOnly: false, source: SOURCE_KEYS.worldmap },
  { code: "NZ", label: "New Zealand", part: "Oceania", curated: false, playable: false, adminOnly: false, source: SOURCE_KEYS.worldmap },
] as const;

/** The country the site is about, always offered on its own. */
export const HOME_MAP_COUNTRY = "JP";

/**
 * Every country a reader may open on the study map.
 *
 * Wider than `playable`: the map game keeps a reserved range of subject ids
 * per country and those ids are stored on every run, so adding a country to
 * the game is a decision about persisted data. Reading a map is not - it draws
 * outlines and names, and the twenty-five countries generated from Natural
 * Earth are true enough to read even though nobody has written their facts.
 */
export function getViewableMapCountries(isAdmin = false) {
  return ALL_MAP_COUNTRIES.filter((country) => isAdmin || !country.adminOnly);
}

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
  /*
   * Reading a map, not playing it. `playable` is a separate and narrower
   * question - the game reserves subject ids per country - and gating the page
   * on it 404'd every country opened for reading.
   */
  return ALL_MAP_COUNTRIES.some(
    (country) => country.code === code && (isAdmin || !country.adminOnly),
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
  const available = getViewableMapCountries(isAdmin);
  const home = available.find((country) => country.code === HOME_MAP_COUNTRY) ?? available[0]!;
  const parts = WORLD_PARTS.map((part) => ({
    part,
    countries: available.filter((country) => country.part === part && country.code !== home.code),
  })).filter((group) => group.countries.length > 0);
  return { home, parts };
}

/**
 * Whether a country's facts were written by a person or generated.
 *
 * Japan, the United States and Canada carry curated metadata - real capitals,
 * populations, areas, the lot. Every other country was generated from Natural
 * Earth boundaries alone, where none of that exists: the builder filled the
 * capital with the division's own name and the population with zero. Those
 * fields are not shown for an uncurated country, because a blank is honest and
 * "Capital: Aisne" is not.
 */
export function isCuratedMapCountry(code: string): boolean {
  return ALL_MAP_COUNTRIES.some((country) => country.code === code && country.curated);
}
