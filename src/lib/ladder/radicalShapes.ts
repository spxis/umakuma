/**
 * Where our radicals and WaniKani's are the same shape spelled differently,
 * and what to call the ones no dictionary names.
 *
 * Two problems with one cause. RADKFILE's list is not WaniKani's, and the two
 * sources reach for different codepoints for the same stroke: we write the
 * divination radical as 卜 (U+535C, a kanji) and WaniKani writes it as ト
 * (U+30C8, katakana TO). They are indistinguishable on screen and unequal in
 * every string comparison, so the crosswalk that pairs a radical with its
 * WaniKani counterpart missed them - which is why a member who learned this
 * one as *toe* was shown "divining" with no sign of the word they knew.
 *
 * Unicode will not do this for us. NFKC folds fullwidth and halfwidth forms
 * but katakana ト and kanji 卜 are separate characters with separate meanings,
 * and normalising them together would be wrong everywhere else on the site.
 * Measured before writing this by hand: NFKC recovers none of them.
 *
 * **No radical ships without a name.** John's rule, and it is enforced rather
 * than intended: `radicalMeanings` throws on a shape it cannot name, which
 * stops the seed with the character printed rather than writing a blank row
 * that becomes a review card drawing its own glyph where the meaning goes.
 */

/**
 * Ours on the left, WaniKani's on the right. Only shapes that are genuinely
 * the same stroke - never two characters that merely look alike at small
 * sizes, which is a different question and belongs to visually-similar.
 */
export const RADICAL_SHAPE_TWINS: Readonly<Record<string, string>> = {
  "卜": "ト",
  "ノ": "丿",
  "｜": "丨",
};

/** WaniKani's spelling back to ours, for a WaniKani surface asking about us. */
export const RADICAL_SHAPE_TWINS_REVERSED: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(RADICAL_SHAPE_TWINS).map(([ours, theirs]) => [theirs, ours]),
);

/**
 * Every katakana, read out in English.
 *
 * A map rather than the six characters that happen to be blank today, because
 * the rule is about the shape and not about the six: RADKFILE is a file we
 * re-read, and a hand-written list of exceptions is a list that goes stale
 * silently the first time it gains a seventh.
 */
const KATAKANA_ROMAJI: Readonly<Record<string, string>> = {
  "ア": "a", "イ": "i", "ウ": "u", "エ": "e", "オ": "o",
  "カ": "ka", "キ": "ki", "ク": "ku", "ケ": "ke", "コ": "ko",
  "サ": "sa", "シ": "shi", "ス": "su", "セ": "se", "ソ": "so",
  "タ": "ta", "チ": "chi", "ツ": "tsu", "テ": "te", "ト": "to",
  "ナ": "na", "ニ": "ni", "ヌ": "nu", "ネ": "ne", "ノ": "no",
  "ハ": "ha", "ヒ": "hi", "フ": "fu", "ヘ": "he", "ホ": "ho",
  "マ": "ma", "ミ": "mi", "ム": "mu", "メ": "me", "モ": "mo",
  "ヤ": "ya", "ユ": "yu", "ヨ": "yo",
  "ラ": "ra", "リ": "ri", "ル": "ru", "レ": "re", "ロ": "ro",
  "ワ": "wa", "ヲ": "wo", "ン": "n",
};

/**
 * The katakana that are also the shape of a number, and the number they are.
 *
 * John's third rule: prefer the English number where there is one. ハ is the
 * shape of 八 and ニ of 二, and a member meeting either of them is meeting a
 * number long before they meet a syllable.
 */
const KATAKANA_NUMBER_WORDS: Readonly<Record<string, string>> = {
  "ハ": "eight",
  "ニ": "two",
};

/**
 * Shapes that are not katakana and not in any dictionary.
 *
 * Only reached when the two rules above cannot answer, so it stays short by
 * construction: a bare vertical stroke is named for what it is, because it
 * resembles no letter to be read out.
 */
const RADICAL_STROKE_NAMES: Readonly<Record<string, readonly string[]>> = {
  "｜": ["bar", "vertical stroke"],
};

/**
 * The WaniKani subject teaching this radical, by character or by shape.
 *
 * `ids` is keyed by WaniKani's own spelling and holds only subjects they still
 * teach - a radical they retired has `hiddenAt` set and is left out upstream,
 * which is why 母, 久 and 臼 have no counterpart despite appearing in the
 * catalogue. WaniKani stopped teaching those three as radicals in 2018, and
 * pairing a member with a subject they can no longer review would be worse
 * than pairing them with nothing.
 */
export function radicalWkSubjectId(
  characters: string,
  ids: ReadonlyMap<string, number> | undefined,
): number | null {
  if (!ids) return null;
  const direct = ids.get(characters);
  if (typeof direct === "number") return direct;
  const twin = RADICAL_SHAPE_TWINS[characters];
  return twin ? (ids.get(twin) ?? null) : null;
}

/**
 * What a radical is called in our own words, and never nothing.
 *
 * The order is John's, 2026-09-05:
 *
 * 1. The dictionary, which names 247 of RADKFILE's 253 because they are also
 *    kanji.
 * 2. The English number, where the shape is one - ハ is *eight*.
 * 3. The katakana read out - ノ is *no*. Kept as an alternative meaning under
 *    rule 2 as well, since it is the honest description of the shape and what
 *    somebody typing an answer is most likely to reach for.
 * 4. A written name, for a stroke that is not a katakana at all.
 * 5. The same shape under WaniKani's spelling, which resolves to whichever of
 *    the four above named ours.
 *
 * WaniKani's own names are deliberately absent from all four. *Fins*, *slide*,
 * *toe* and *stick* are their invented content, so they are resolved at
 * display time for members who have connected an account rather than seeded
 * into a curriculum everybody reads. ハ is *fins* to a WaniKani member and
 * *eight* to everybody else, and both are true.
 *
 * Throws rather than returning empty. A radical with no name is the bug this
 * exists to end, and a seed that stops with the character printed is cheaper
 * than a blank card nobody notices for a week.
 */
export function radicalMeanings(
  characters: string,
  fromDictionary: readonly string[] | undefined,
): string[] {
  if (fromDictionary && fromDictionary.length > 0) return [...fromDictionary];

  const romaji = KATAKANA_ROMAJI[characters];
  if (romaji) {
    const number = KATAKANA_NUMBER_WORDS[characters];
    return number ? [number, romaji, `katakana ${romaji}`] : [romaji, `katakana ${romaji}`];
  }

  const written = RADICAL_STROKE_NAMES[characters];
  if (written) return [...written];

  /* The same shape under WaniKani's spelling. 丿 is our ノ and 丨 is our ｜, so
     a caller handing in either one gets the name we already decided rather
     than a refusal - and the two spellings cannot drift into two names,
     because there is only ever one. */
  const ours = RADICAL_SHAPE_TWINS_REVERSED[characters];
  if (ours && ours !== characters) return radicalMeanings(ours, undefined);

  throw new Error(
    `No name for the radical ${characters} (U+${characters.codePointAt(0)?.toString(16).toUpperCase()}). ` +
      "Add it to RADICAL_STROKE_NAMES in src/lib/ladder/radicalShapes.ts — no radical may ship unnamed.",
  );
}

/** The katakana a shape is, for a surface that wants to say so. Null if none. */
export function katakanaRomaji(characters: string): string | null {
  return KATAKANA_ROMAJI[characters] ?? null;
}
