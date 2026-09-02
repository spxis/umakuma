import { toRomaji } from "wanakana";

import { READING_KINDS, type ReadingKind } from "./domainConstants";
import { hiraganaToKatakana, katakanaToHiragana } from "./kana";

/**
 * A reading, written the way a dictionary writes it.
 *
 * On readings are shown in katakana and kun readings in hiragana - the
 * convention every reference uses, and the visual cue that tells the two
 * apart before the label is read. The sources are not consistent about it:
 * KANJIDIC writes on in katakana, the school tables sometimes in hiragana,
 * WaniKani everything in hiragana. One conversion here rather than a hope
 * per surface.
 *
 * The dots and middle dots that mark okurigana (た.べる) are dropped for
 * display; they are dictionary notation, not part of the word.
 */
export function formatReading(kind: ReadingKind, reading: string): string {
  const plain = reading.replace(/[.・]/g, "").trim();
  return kind === READING_KINDS.on ? hiraganaToKatakana(plain) : katakanaToHiragana(plain);
}

/**
 * The reading in Latin letters, or null when that would say nothing new.
 *
 * For someone still weak in kana, the romaji beside a reading is what lets
 * them read it at all. Null rather than an echo where the input was already
 * Latin or empty, so a surface can leave the space alone.
 */
export function romajiForReading(reading: string | null | undefined): string | null {
  const plain = reading?.replace(/[.・]/g, "").trim();
  if (!plain || plain === "-") return null;
  const romaji = toRomaji(plain, { upcaseKatakana: false }).trim();
  return romaji && romaji !== plain ? romaji : null;
}
