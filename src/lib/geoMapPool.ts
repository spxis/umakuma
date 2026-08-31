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
  /** The seat of government, for the capitals round. */
  capital: string;
};

export function geoMapEntries(country: CountryCode): GeoMapEntry[] {
  return GEO_DATASETS[country].regions.map((region) => toEntry(region));
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
    capital: region.capital?.name ?? "",
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
