import { GEO_DATASETS, type GeoRegion } from "./geoRegion";
import { getPrefectureMetadataByCode } from "./japanPrefectures";
import { isMapCountry, type MapCountryCode } from "./mapCountries";

/**
 * A map to learn a country by, rather than only to be quizzed on.
 *
 * The Map game holds every region's shape and a page of facts about it, and
 * showed them one question at a time. This is the same data laid out to be
 * read: a region is chosen, and what is known about it is put beside the map.
 * These are the rules for what the page shows and how it is addressed, kept
 * as maths so they can be tested without a browser.
 */

export const MAP_STUDY_HREF = "/map";
export const MAP_STUDY_PARAMS = { country: "country", region: "region" } as const;
export const DEFAULT_MAP_COUNTRY: MapCountryCode = "JP";

export type MapStudyAddress = { country: MapCountryCode; code: string | number | null };

type ParamSource = URLSearchParams | Record<string, string | string[] | undefined>;

function readParam(source: ParamSource, key: string): string | null {
  if (source instanceof URLSearchParams) return source.get(key);
  const value = source[key];
  return (Array.isArray(value) ? value[0] : value) ?? null;
}

/** The region a code names, matched the way the address writes it. */
export function regionByCode(country: MapCountryCode, raw: string | number | null): GeoRegion | null {
  if (raw === null || raw === "") return null;
  const wanted = String(raw).trim().toUpperCase();
  return GEO_DATASETS[country].regions.find((region) => String(region.code).toUpperCase() === wanted) ?? null;
}

/** What the address says, with Japan and nothing chosen when it says nothing. */
export function parseMapStudyAddress(source: ParamSource): MapStudyAddress {
  const rawCountry = readParam(source, MAP_STUDY_PARAMS.country)?.toUpperCase() ?? "";
  const country: MapCountryCode = isMapCountry(rawCountry) ? rawCountry : DEFAULT_MAP_COUNTRY;
  const region = regionByCode(country, readParam(source, MAP_STUDY_PARAMS.region));
  return { country, code: region?.code ?? null };
}

/** The address for a view, saying only what is not the default. */
export function mapStudyHref(country: MapCountryCode, code: string | number | null): string {
  const params = new URLSearchParams();
  if (country !== DEFAULT_MAP_COUNTRY) params.set(MAP_STUDY_PARAMS.country, country);
  if (code !== null) params.set(MAP_STUDY_PARAMS.region, String(code));
  const search = params.toString();
  return search ? `${MAP_STUDY_HREF}?${search}` : MAP_STUDY_HREF;
}

/**
 * The regions in the order a list should offer them: Japan by prefecture
 * code, which runs north to south the way every Japanese map is read, and
 * the others by name, which is how their own people look them up.
 */
export function regionsInOrder(country: MapCountryCode): GeoRegion[] {
  const regions = [...GEO_DATASETS[country].regions];
  if (country === DEFAULT_MAP_COUNTRY) return regions.sort((left, right) => Number(left.code) - Number(right.code));
  return regions.sort((left, right) => left.name.localeCompare(right.name, "en"));
}

export type Fact = { label: string; value: string; native?: string };

/** One block of the panel: a table of facts, or a list, with the native-script twin where there is one. */
export type FactGroup = {
  id: string;
  heading: string;
  facts?: Fact[];
  items?: string[];
  itemsNative?: string[];
};

const number = new Intl.NumberFormat("en-CA");

function fact(label: string, value: string | number | undefined | null, native?: string | null): Fact | null {
  if (value === undefined || value === null || value === "") return null;
  const text = typeof value === "number" ? number.format(value) : value;
  return native && native !== text ? { label, value: text, native } : { label, value: text };
}

function list(id: string, heading: string, items: string[] | undefined, itemsNative?: string[]): FactGroup | null {
  if (!items || items.length === 0) return null;
  return itemsNative && itemsNative.length > 0 ? { id, heading, items, itemsNative } : { id, heading, items };
}

export const FACT_HEADINGS = {
  glance: "At a glance",
  nicknames: "Also called",
  rankings: "Number one for",
  foods: "Food",
  landmarks: "Landmarks",
  specialties: "Known for",
  symbols: "Symbols",
  emblem: "Emblem",
  history: "History",
  people: "People",
} as const;

export const FACT_LABELS = {
  capital: "Capital",
  largestCity: "Largest city",
  region: "Region",
  population: "Population",
  area: "Area",
  admitted: "Admitted",
  statehoodOrder: "State number",
  confederation: "Joined Confederation",
  languages: "Official languages",
  motto: "Motto",
  flower: "Flower",
  tree: "Tree",
  bird: "Bird",
  provinces: "Historical provinces",
} as const;

/**
 * Everything known about a region, grouped for reading and with the empty
 * groups dropped. Japan's own file carries the Japanese for the food, the
 * landmarks and the rankings, so those come out beside the English; the
 * other countries have one language of record.
 */
export function regionFacts(region: GeoRegion): FactGroup[] {
  const jp = region.country === DEFAULT_MAP_COUNTRY ? getPrefectureMetadataByCode(Number(region.code)) : undefined;
  const extras = region.extras ?? {};

  const glance: Fact[] = [
    fact(FACT_LABELS.capital, region.capital.name, region.capital.nameNative),
    region.largestCity && region.largestCity !== region.capital.name
      ? fact(FACT_LABELS.largestCity, region.largestCity, jp?.largestCity?.kanji)
      : null,
    fact(FACT_LABELS.region, region.region),
    fact(FACT_LABELS.population, region.population),
    fact(FACT_LABELS.area, `${number.format(region.areaKm2)} km² · ${number.format(region.areaSqMi)} sq mi`),
    /* Years are names, not counts: 1850, never 1,850. */
    fact(FACT_LABELS.admitted, extras.admittedYear?.toString()),
    fact(FACT_LABELS.statehoodOrder, extras.statehoodOrder?.toString()),
    fact(FACT_LABELS.confederation, extras.enteredConfederationYear?.toString()),
    fact(FACT_LABELS.languages, extras.officialLanguages?.join(", ")),
    fact(FACT_LABELS.motto, extras.motto),
  ].filter((row): row is Fact => row !== null);

  const symbols: Fact[] = [
    fact(FACT_LABELS.flower, region.symbols?.flower),
    fact(FACT_LABELS.tree, region.symbols?.tree),
    fact(FACT_LABELS.bird, region.symbols?.bird),
  ].filter((row): row is Fact => row !== null);

  const groups: (FactGroup | null)[] = [
    glance.length > 0 ? { id: "glance", heading: FACT_HEADINGS.glance, facts: glance } : null,
    list("nicknames", FACT_HEADINGS.nicknames, region.nicknames),
    list("rankings", FACT_HEADINGS.rankings, region.no1Rankings, jp?.no1RankingsJa),
    list("foods", FACT_HEADINGS.foods, region.famousFor.foods, jp?.famousFor.foodsJa),
    list("landmarks", FACT_HEADINGS.landmarks, region.famousFor.landmarks, jp?.famousFor.landmarksJa),
    list("specialties", FACT_HEADINGS.specialties, region.famousFor.specialties, jp?.famousFor.specialtiesJa),
    symbols.length > 0 ? { id: "symbols", heading: FACT_HEADINGS.symbols, facts: symbols } : null,
    extras.emblem?.description ? { id: "emblem", heading: FACT_HEADINGS.emblem, items: [extras.emblem.description] } : null,
    list("history", FACT_HEADINGS.history, extras.historicalProvinces),
    list(
      "people",
      FACT_HEADINGS.people,
      jp?.historicIcons?.map((icon) => `${icon.name} — ${icon.role}`),
    ),
  ];

  return groups.filter((group): group is FactGroup => group !== null);
}

/** The kanji a Japanese prefecture is written with; empty elsewhere. */
export function regionKanji(region: GeoRegion): string[] {
  return region.extras?.kanjiTagging?.prefectureKanji ?? [];
}
