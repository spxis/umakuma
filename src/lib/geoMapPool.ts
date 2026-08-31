import { GEO_DATASETS, type CountryCode, type GeoRegion } from "./geoRegion";
import { geoSubjectId } from "./geoSubjectIds";
import { SUBJECT_TYPES } from "./domainConstants";
import type { GameOption } from "./gameMode";

/**
 * A country's regions in the shape the map question builder already understands.
 *
 * The builder was written against `JapanPrefecture` and reads only five things
 * from it: a code, a region name, a centroid, its neighbours, and the three
 * labels an option shows. Every country's dataset carries all five, so the
 * builder does not need rewriting - it needs the other countries handed to it
 * in the shape it already reads.
 *
 * Japan stays the default everywhere. The United States and Canada are a bonus
 * mode over the same machinery rather than a second implementation of it.
 */
export type GeoMapEntry = {
  country: CountryCode;
  code: string | number;
  region: string;
  centroid: [number, number];
  neighbors: ReadonlyArray<string | number>;
  /** What the tiles print: the native name, the English name, the reading. */
  kanji: string;
  romaji: string;
  reading: string;
  /** The seat of government, written the way this country's tiles are. */
  capital: string;
  /**
   * Whether naming the capital actually asks anything.
   *
   * Twenty-nine of Japan's forty-seven prefectures share their capital's name
   * - Saitama, Chiba, Kyoto, Osaka - so those questions answer themselves. The
   * eighteen that differ are the ones worth learning: Hokkaido and Sapporo,
   * Kanagawa and Yokohama, Aichi and Nagoya.
   */
  capitalDiffers: boolean;
};

export function geoMapEntries(country: CountryCode): GeoMapEntry[] {
  return GEO_DATASETS[country].regions.map((region) => toEntry(region));
}

/**
 * The regions worth asking about by capital.
 *
 * Falls back to the whole country if too few differ, because a round of four
 * questions repeated is worse than an easy one. In practice Japan has
 * eighteen, the United States fifty-one and Canada thirteen.
 */
export function geoCapitalEntries(country: CountryCode): GeoMapEntry[] {
  const differing = geoMapEntries(country).filter((entry) => entry.capitalDiffers);
  return differing.length >= 8 ? differing : geoMapEntries(country);
}

function toEntry(region: GeoRegion): GeoMapEntry {
  return {
    country: region.country,
    code: region.code,
    region: region.region,
    centroid: region.map.centroid,
    neighbors: region.map.neighbors,
    /*
     * Japan prints kanji, because the written form is the thing being learned
     * and it is not the English name in another font.
     *
     * Elsewhere the tile prints the English name. Canada's dataset carries
     * French in `nameNative`, and using it made every Canadian tile French -
     * which is a choice, not a translation, since both languages are equally
     * native there. Offering French is worth doing deliberately one day; it
     * should not arrive by accident.
     */
    kanji: region.country === "JP" ? region.nameNative ?? region.name : region.name,
    romaji: region.name,
    reading: region.reading ?? region.name,
    /*
     * Japan's tiles are kanji, so its capital prompt is too - 札幌市 beside
     * 北海道 rather than a romaji word in a Japanese round. Elsewhere the plain
     * name is the only form there is.
     */
    capital:
      region.country === "JP"
        ? region.capital?.nameNative ?? region.capital?.name ?? ""
        : region.capital?.name ?? "",
    // Compared on the romanised names, whichever script is displayed.
    capitalDiffers:
      Boolean(region.capital?.name) &&
      region.capital.name.trim().toLowerCase() !== region.name.trim().toLowerCase(),
  };
}

/** The diagonal of a country's map, which sets the distance scale for distractors. */
export function geoMapDiagonal(country: CountryCode): number {
  const dataset = GEO_DATASETS[country];
  return Math.hypot(dataset.width, dataset.height);
}

/** One region as a game option, on that country's own id range. */
export function geoMapOption(entry: GeoMapEntry): GameOption {
  return {
    subjectId: geoSubjectId(entry.country, entry.code) ?? 0,
    subjectType: SUBJECT_TYPES.vocabulary,
    // Places sit outside the WaniKani level ladder.
    level: 0,
    characters: entry.kanji,
    primaryMeaning: entry.romaji,
    primaryReading: entry.reading,
  };
}
