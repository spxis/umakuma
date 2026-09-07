/**
 * Why a character carries no level, said out loud.
 *
 * A chip with an empty meta row is a question with two answers - "we know
 * nothing about this character" and "no system teaches this character" - and
 * a reader cannot tell them apart. John asked exactly that of 竈 in 七竈 on
 * the 七 page: no WK chip, no UN chip, "does this mean it is not even G1-6 or
 * JLPT Nx?" It did, and the row had no way to say so.
 *
 * The same argument `levelBadge` makes about a bare `L3`: a number that does
 * not say whose it is. Absence is worse, because it says nothing at all.
 *
 * Two notes rather than one, because "off every list" and "on the names list"
 * are different facts and the second one is the answer to "then why is it in
 * this word at all". 竈 is hyōgai - KANJIDIC has it grade null, jlptOld null,
 * unranked for frequency - while the 戊 of 戊午 is jinmeiyō, a list we
 * deliberately do not teach rather than no list at all.
 *
 * Pure, and paired with `kanjiListingServer.ts`, which does the looking up:
 * that half reads KANJIDIC through a file reader and cannot be bundled into a
 * client component. A chip is handed the note; it never asks for it.
 */
export const KANJI_LISTING_NOTES = {
  /** On the jinmeiyō list: names, and nothing we teach. */
  names: "names",
  /** On nothing at all: not WaniKani, not either ladder, not a grade, not JLPT. */
  off: "off",
} as const;

export type KanjiListingNote = (typeof KANJI_LISTING_NOTES)[keyof typeof KANJI_LISTING_NOTES];

/**
 * What the chip prints, and what it says on hover.
 *
 * One shared source, per the display-label rule: these are canonical domain
 * words and the pill, the identity card and anything after them read the same
 * map rather than each spelling "Off-list" out again.
 */
export const KANJI_LISTING_NOTE_DISPLAY: Record<KanjiListingNote, { label: string; title: string }> = {
  [KANJI_LISTING_NOTES.names]: {
    label: "Names",
    title: "Jinmeiyō: approved for personal names, outside the kanji taught here.",
  },
  [KANJI_LISTING_NOTES.off]: {
    label: "Off-list",
    title: "On no list here: not WaniKani, not UmaKuma, not a school grade, not JLPT.",
  },
};
