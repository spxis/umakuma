import { GEO_DATASETS, type GeoRegion } from "./geoRegion";

/**
 * What to call a region, and in which script.
 *
 * Every dataset carries a second name per region, and for a while every
 * surface treated all of them as Japanese: the directory, the chips under the
 * map, the detail panel and the pointer label each ran the same
 * `nameNative !== name` check and each wrapped the result in `lang="ja"`.
 *
 * For Japan that is right, and it is the point - 北海道 is the thing being
 * learned and Hokkaido is the gloss under it. For Canada the second name is
 * the French one, so an English-language site led every row with
 * Colombie-Britannique and tagged it as Japanese, which a screen reader would
 * have tried to read as Japanese.
 *
 * So the rule is not "is there another name" but "is the other name a script
 * this site teaches". Only Japan says yes. Canada's French names stay in the
 * data, where an fr-CA locale can pick them up; they are not an English
 * page's headline.
 */
export type RegionNameLines = {
  /** The headline, in the script the reader is here for. */
  lead: string;
  /** Its BCP-47 tag when the headline is not the site language. */
  leadLang: string | null;
  /** The gloss under it, or null when the headline is already English. */
  sub: string | null;
};

/** The scripts a member is here to learn, by country. */
const LEARNED_SCRIPT: Partial<Record<keyof typeof GEO_DATASETS, string>> = {
  JP: "ja",
};

export function regionNameLines(region: GeoRegion): RegionNameLines {
  const lang = LEARNED_SCRIPT[region.country];
  const native = region.nameNative?.trim();

  if (lang && native && native !== region.name) {
    return { lead: native, leadLang: lang, sub: region.name };
  }
  return { lead: region.name, leadLang: null, sub: null };
}

/**
 * One line naming a region, for a pointer read-out or a tooltip.
 *
 * "北海道 Hokkaido" where the script is taught, "Alberta" where it is not.
 */
export function regionNameLabel(region: GeoRegion): string {
  const { lead, sub } = regionNameLines(region);
  return sub ? `${lead} ${sub}` : lead;
}
