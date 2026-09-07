import "server-only";

import { gradePlacement } from "@/lib/gradeLadder";
import { getKanjiDictionaryEntry } from "@/lib/kanjiDictionary";
import { kanjiPlacement } from "@/lib/kanjiLadder";
import { KANJI_LISTING_NOTES, type KanjiListingNote } from "@/lib/kanjiListing";

/**
 * The note a character has earned, or null when some list does teach it.
 *
 * Null is the common answer and the cheap one to draw: a caller asks, gets
 * nothing back for the 2,235 characters on the ladder, and prints the levels
 * it already has. Only a character that fell through every catalogue gets a
 * word for it.
 *
 * Checked widest-first, so a character on any list at all is out before the
 * dictionary is opened. `kanjiPlacement` carries WaniKani's level and the
 * JLPT band with ours, which is why one lookup answers for three of them.
 */
export function kanjiListingNote(character: string): KanjiListingNote | null {
  if (kanjiPlacement(character) !== null) return null;
  if (gradePlacement(character) !== null) return null;

  const entry = getKanjiDictionaryEntry(character);
  /* Jōyō and kyōiku are grades 1-8. A character there is taught somewhere
     even if our own ladders have not placed it, so it is not off-list. */
  if (typeof entry?.grade === "number" && entry.grade <= 8) return null;
  if (typeof entry?.jlptOld === "number") return null;
  if (typeof entry?.grade === "number") return KANJI_LISTING_NOTES.names;

  return KANJI_LISTING_NOTES.off;
}
