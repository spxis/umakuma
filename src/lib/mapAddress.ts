import { GEO_DATASETS, type CountryCode, type GeoRegion } from "./geoRegion";

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
};

export function countryForSlug(slug: string | undefined | null): CountryCode | null {
  if (!slug) return null;
  const wanted = slug.trim().toLowerCase();
  return (Object.keys(MAP_COUNTRY_SLUGS) as CountryCode[]).find((code) => MAP_COUNTRY_SLUGS[code] === wanted) ?? null;
}

/** A region's name as an address: the romaji for Japan, the English elsewhere. */
export function regionSlug(region: GeoRegion): string {
  return region.name
    .toLowerCase()
    .split("")
    .map((character) => (/[a-z0-9]/.test(character) ? character : "-"))
    .join("")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function regionForSlug(country: CountryCode, slug: string | undefined | null): GeoRegion | null {
  if (!slug) return null;
  const wanted = slug.trim().toLowerCase();
  return GEO_DATASETS[country].regions.find((region) => regionSlug(region) === wanted) ?? null;
}

export type MapAddress = { country: CountryCode; code: string | number | null };

/** What a `/maps/...` path names: a country, and a region within it. */
export function parseMapPath(segments: readonly string[] | undefined): MapAddress | null {
  if (!segments || segments.length === 0) return { country: "JP", code: null };
  if (segments.length > 2) return null;
  const country = countryForSlug(segments[0]);
  if (!country) return null;
  if (segments.length === 1) return { country, code: null };
  const region = regionForSlug(country, segments[1]);
  return region ? { country, code: region.code } : null;
}

export function mapHref(country: CountryCode, code: string | number | null): string {
  const base = `${MAPS_HREF}/${MAP_COUNTRY_SLUGS[country]}`;
  if (code === null) return base;
  const region = GEO_DATASETS[country].regions.find((candidate) => String(candidate.code) === String(code));
  return region ? `${base}/${regionSlug(region)}` : base;
}
