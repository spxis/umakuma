import { GEO_DATASETS, type CountryCode, type GeoRegion } from "./geoRegion";
import { areaNameOf, areasOf } from "./mapDirectory";

/**
 * Where a map lives, as a path rather than a question.
 *
 * `/map?region=21` said nothing to anybody: not to a reader, not to a link
 * shared in a chat, not to a search engine. A map is a place, so it is
 * addressed as one - `/maps/japan/gifu` - and every part of it can be linked
 * to on its own. The old address is gone rather than redirected; a site with
 * two addresses for one page has to explain which is real.
 */
export const MAPS_HREF = "/maps";

export const MAP_COUNTRY_SLUGS: Record<CountryCode, string> = {
  JP: "japan",
  US: "united-states",
  CA: "canada",
  TH: "thailand",
  CN: "china",
  AU: "australia",
  TW: "taiwan",
  AR: "argentina",
  AT: "austria",
  BE: "belgium",
  BR: "brazil",
  CL: "chile",
  CO: "colombia",
  FR: "france",
  DE: "germany",
  IE: "ireland",
  IT: "italy",
  MY: "malaysia",
  MX: "mexico",
  NL: "netherlands",
  NZ: "new-zealand",
  NO: "norway",
  PE: "peru",
  PH: "philippines",
  PL: "poland",
  RU: "russia",
  KR: "south-korea",
  ES: "spain",
  SE: "sweden",
  CH: "switzerland",
  GB: "united-kingdom",
  VN: "vietnam",
};

export function countryForSlug(slug: string | undefined | null): CountryCode | null {
  if (!slug) return null;
  const wanted = slug.trim().toLowerCase();
  return (Object.keys(MAP_COUNTRY_SLUGS) as CountryCode[]).find((code) => MAP_COUNTRY_SLUGS[code] === wanted) ?? null;
}

/*
 * The word that says the next segment names a region - Tohoku, the Prairies -
 * rather than a prefecture or province.
 *
 * It has to be a word and not a position. Japan has a region and a prefecture
 * both called Hokkaido, and again Okinawa, so `/maps/japan/hokkaido` cannot
 * mean both; the marker keeps every country parsing the same way instead of
 * special-casing the one where the names collide.
 *
 * "region" in the address and in copy, because that is what these are - the
 * Tohoku region, the Census regions, the regions of Canada. The code calls
 * them areas, since the type for a prefecture is already `GeoRegion`; that
 * rename is its own job.
 */
export const REGION_PATH_SEGMENT = "region";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .split("")
    .map((character) => (/[a-z0-9]/.test(character) ? character : "-"))
    .join("")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** A region's name as an address: the romaji for Japan, the English elsewhere. */
export function regionSlug(region: GeoRegion): string {
  return slugify(region.name);
}

/** "West Coast" as an address: `west-coast`. */
export function areaSlug(area: string): string {
  return slugify(area);
}

export function areaForSlug(country: CountryCode, slug: string | undefined | null): string | null {
  if (!slug) return null;
  const wanted = slug.trim().toLowerCase();
  return areasOf(GEO_DATASETS[country]?.regions ?? []).find((area) => areaSlug(area) === wanted) ?? null;
}

export function regionForSlug(country: CountryCode, slug: string | undefined | null): GeoRegion | null {
  if (!slug) return null;
  const wanted = slug.trim().toLowerCase();
  return (GEO_DATASETS[country]?.regions ?? []).find((region) => regionSlug(region) === wanted) ?? null;
}

export type MapAddress = {
  country: CountryCode;
  /** A region lit as a whole - its display name, or null. */
  area: string | null;
  /** The one prefecture or province chosen, or null. */
  code: string | number | null;
};

/**
 * What a `/maps/...` path names.
 *
 *   /maps/canada                                   the country
 *   /maps/canada/british-columbia                  one province, full map
 *   /maps/canada/region/west-coast                 a region, lit and framed
 *   /maps/canada/region/west-coast/british-columbia  a province chosen within it
 *
 * A province named under a region it is not in is a 404, not a guess: the
 * address is making a claim about the map, and a wrong one should not open.
 */
export function parseMapPath(segments: readonly string[] | undefined): MapAddress | null {
  if (!segments || segments.length === 0) return { country: "JP", area: null, code: null };
  const country = countryForSlug(segments[0]);
  if (!country) return null;
  if (segments.length === 1) return { country, area: null, code: null };

  if (segments[1] === REGION_PATH_SEGMENT) {
    if (segments.length > 4) return null;
    const area = areaForSlug(country, segments[2]);
    if (!area) return null;
    if (segments.length === 3) return { country, area, code: null };
    const region = regionForSlug(country, segments[3]);
    if (!region || areaNameOf(region) !== area) return null;
    return { country, area, code: region.code };
  }

  if (segments.length > 2) return null;
  const region = regionForSlug(country, segments[1]);
  return region ? { country, area: null, code: region.code } : null;
}

export function mapHref(country: CountryCode, code: string | number | null, area: string | null = null): string {
  const base = `${MAPS_HREF}/${MAP_COUNTRY_SLUGS[country]}`;
  const region =
    code === null ? null : (GEO_DATASETS[country]?.regions ?? []).find((candidate) => String(candidate.code) === String(code));

  /* A region the province is not in is not an address; drop it rather than lie. */
  const lit = area && (!region || areaNameOf(region) === area) ? area : null;

  const parts = [base];
  if (lit) parts.push(REGION_PATH_SEGMENT, areaSlug(lit));
  if (region) parts.push(regionSlug(region));
  return parts.join("/");
}
