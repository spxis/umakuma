import "server-only";

/* Every country in memory. The browser loads one at a time; the server, which
   ships no bundle, wants the lot - see geoRegionServer. */
import "./geoRegionServer";

import { GEO_DATASETS, type CountryCode } from "./geoRegion";
import { getKanjiDictionaryEntry } from "./kanjiDictionary";
import { regionKanji } from "./mapStudy";

/**
 * What each kanji in a region's name means and how it reads.
 *
 * The panel drew the characters of 埼玉県 as three coloured boxes of its own
 * making - no meaning, no reading, and no way to put one on a list, on a site
 * where every other place a kanji appears offers all three. The shared card
 * needs those facts, and the dictionary is `server-only`, so they are resolved
 * once on the server and handed down.
 *
 * Every country at once, and it is cheap: only Japan's regions are written in
 * kanji at all, which is 47 names and about 90 distinct characters. Doing it
 * per country would mean fetching again when somebody switches to Canada and
 * back, for a lookup that fits in a few kilobytes.
 */
export type MapKanjiFact = { meaning: string; reading: string | null };

export type MapKanjiFacts = Record<string, MapKanjiFact>;

export function mapRegionKanjiFacts(): MapKanjiFacts {
  const facts: MapKanjiFacts = {};
  for (const country of Object.keys(GEO_DATASETS) as CountryCode[]) {
    for (const region of GEO_DATASETS[country].regions) {
      for (const character of regionKanji(region)) {
        if (facts[character]) continue;
        const entry = getKanjiDictionaryEntry(character);
        facts[character] = {
          meaning: entry?.primaryMeaning || entry?.meanings?.[0] || "",
          /*
           * On'yomi first, then kun, then the name-only readings. A place name
           * is often the third - 埼 reads さき only in names - so nanori is the
           * one that must not be dropped here, of all the pages that show a
           * kanji.
           */
          reading:
            entry?.readings.on[0] ?? entry?.readings.kun[0] ?? entry?.readings.nanori[0] ?? null,
        };
      }
    }
  }
  return facts;
}
