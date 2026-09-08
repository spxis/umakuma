/**
 * A confusable pairing, ready to draw.
 *
 * The pairs file holds characters and scores and nothing else, on purpose: a
 * meaning and a reading already have a home in KANJIDIC2 and a level already
 * has one on the ladder, and copying either into a second file is how they
 * come to disagree. This is where the three meet, and it is all file reads —
 * no database, so it works for the 134 joyo kanji WaniKani never teaches.
 */
import { kanjiPageHref } from "@/app/shared/subject-page/subjectSectionAddress";

import { confusablesFor, type ConfusableSource } from "./kanjiConfusables";
import { getKanjiDictionaryEntry, primaryKanjiReading } from "./kanjiDictionary";
import type { KanjiListingNote } from "./kanjiListing";
import { kanjiListingNote } from "./kanjiListingServer";
import { ourLevels } from "./ladder/ourLevels";
import type { LadderStreamValue } from "./ladder/ladderStreams";

export type ConfusableView = {
  kanji: string;
  /** KANJIDIC2's first meaning, or null for a character it does not hold. */
  meaning: string | null;
  reading: string | null;
  href: string;
  /**
   * Where the reader's ladder teaches it, which is the useful half of the
   * warning. One of the two is filled, the other null - see `ourLevels`.
   */
  unLevel: number | null;
  ugLevel: number | null;
  /** Why it carries no level, for a twin no list teaches. Null otherwise. */
  listing: KanjiListingNote | null;
  sources: ConfusableSource[];
};

/**
 * The characters this one is mistaken for, in the order the file ranks them.
 *
 * On-reading first, because a pair is nearly always met as a compound: 士 and
 * 土 are シ and ド long before anybody needs つち.
 */
export function confusableViewsFor(character: string, stream: LadderStreamValue | null): ConfusableView[] {
  return confusablesFor(character).map((neighbour) => {
    const entry = getKanjiDictionaryEntry(neighbour.kanji);

    return {
      kanji: neighbour.kanji,
      meaning: entry?.primaryMeaning ?? null,
      reading: primaryKanjiReading(entry),
      href: kanjiPageHref(neighbour.kanji),
      ...ourLevels(neighbour.kanji, stream),
      listing: kanjiListingNote(neighbour.kanji),
      sources: neighbour.sources,
    };
  });
}
