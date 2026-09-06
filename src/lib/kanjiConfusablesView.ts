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
import { getKanjiDictionaryEntry } from "./kanjiDictionary";
import { kanjiPlacement } from "./kanjiLadder";

export type ConfusableView = {
  kanji: string;
  /** KANJIDIC2's first meaning, or null for a character it does not hold. */
  meaning: string | null;
  reading: string | null;
  href: string;
  /** Where the ladder teaches it, which is the useful half of the warning. */
  unLevel: number | null;
  sources: ConfusableSource[];
};

/** KANJIDIC2 marks okurigana with a dot — `かんが.える`. A reader wants the reading. */
function withoutOkuriganaMark(reading: string): string {
  return reading.replace(/\./g, "");
}

/**
 * The characters this one is mistaken for, in the order the file ranks them.
 *
 * On-reading first, because a pair is nearly always met as a compound: 士 and
 * 土 are シ and ド long before anybody needs つち.
 */
export function confusableViewsFor(character: string): ConfusableView[] {
  return confusablesFor(character).map((neighbour) => {
    const entry = getKanjiDictionaryEntry(neighbour.kanji);
    const reading = entry?.readings.on[0] ?? entry?.readings.kun[0] ?? null;
    return {
      kanji: neighbour.kanji,
      meaning: entry?.primaryMeaning ?? null,
      reading: reading ? withoutOkuriganaMark(reading) : null,
      href: kanjiPageHref(neighbour.kanji),
      unLevel: kanjiPlacement(neighbour.kanji)?.level ?? null,
      sources: neighbour.sources,
    };
  });
}
