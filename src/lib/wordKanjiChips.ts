/**
 * The characters a word is written with — all of them.
 *
 * The chip row under a compound used to be drawn from the enrichment stored
 * beside the word, and that list holds only the kanji WaniKani teaches. Twice
 * over, in fact: the backfill wrote no entry for a character it could not
 * place, and `parseJlptWordExamples` then dropped any entry without a
 * WaniKani subject id and level.
 *
 * So 戊午 and 丙午 and 庚午 each drew a single chip — 午, and nothing else —
 * and 壬午軍乱 drew three of its four. A reader counts the chips against the
 * word printed above them and finds the maths wrong, which is the same
 * complaint that put the current character back in the row.
 *
 * A word is written with what it is written with. The word is the source of
 * truth for its own characters; the enrichment is a source of *facts about*
 * them, layered on where it has any. 丙 is jōyō and 戊, 壬, 庚 are jinmeiyō —
 * a track the ladder deliberately does not teach — so the difference between
 * "we have nothing to say about this character" and "this character is not
 * here" is exactly what the row has to keep.
 *
 * Pure, and no I/O: a caller that can reach the dictionary layers the meanings
 * on afterwards, and a client component draws the glyph with whatever facts
 * came down the wire.
 */

/** Han only: kana and punctuation in a word are not chips. */
const HAN = /\p{Script=Han}/u;

export type WordKanjiFacts = {
  label: string;
  reading?: string | null;
  meaning?: string | null;
  wkLevel?: number | null;
};

export type WordKanjiChip = {
  label: string;
  reading: string | null;
  meaning: string | null;
  level: number | null;
  /** True for the character whose page this is; it is drawn, but leads nowhere. */
  current: boolean;
};

/**
 * Every kanji in the word, in the order it is written, each carrying whatever
 * the enrichment knows about it.
 *
 * A character repeated in a word — 人人, 各々 written out — is a chip each
 * time, because the row is the spelling rather than a set.
 */
export function wordKanjiChips(
  written: string,
  facts: readonly WordKanjiFacts[] = [],
  currentCharacter?: string,
): WordKanjiChip[] {
  const byLabel = new Map(facts.map((fact) => [fact.label, fact]));

  return [...written].filter((character) => HAN.test(character)).map((character) => {
    const known = byLabel.get(character);
    return {
      label: character,
      reading: known?.reading ?? null,
      meaning: known?.meaning ?? null,
      level: typeof known?.wkLevel === "number" ? known.wkLevel : null,
      current: character === currentCharacter,
    };
  });
}
