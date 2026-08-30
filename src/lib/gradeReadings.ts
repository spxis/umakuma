import "server-only";

import { getJoyoReadings } from "./joyoReadings";
import type { SchoolGradeKanjiEntry } from "./schoolGrades.types";

/**
 * Swaps a grade entry's readings for the officially recognised ones.
 *
 * The grade data carries KANJIDIC's exhaustive list, which is a dictionary's
 * job rather than a curriculum's: every reading a character has ever taken,
 * compound-only forms included. That is how 王 came to show a kun reading of
 * のう, a form that only exists inside a word like 親王.
 *
 * The 常用漢字表 lists the readings for general use, so it is shorter and
 * authoritative, and it settles the on/kun split by script rather than by
 * guesswork - which is why 音's イン becomes an on reading here.
 *
 * Jinmeiyō name kanji are outside that table by definition, so they keep what
 * they had. Better an over-long list than none.
 */
export function withOfficialReadings(entries: SchoolGradeKanjiEntry[]): SchoolGradeKanjiEntry[] {
  return entries.map((entry) => {
    const official = getJoyoReadings(entry.kanji);
    if (!official) {
      return entry;
    }

    const readings = { on: official.on, kun: official.kun };
    return { ...entry, readings, gradeApprovedReadings: readings };
  });
}
