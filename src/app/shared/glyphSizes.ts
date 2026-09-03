import { NO_TRANSLATE_CLASS } from "./japaneseText";

/**
 * How big a glyph is drawn, in the two sizes this site has.
 *
 * There were more. A subject page headed itself at `text-5xl sm:text-6xl`, an
 * explorer card measured by length, five list surfaces each typed out
 * `text-2xl font-black leading-none` in full, and one of the five had drifted
 * to `sm:text-3xl` while another had lost its `lang="ja"` on the way. None of
 * that was a decision anybody made; it was five copies aging apart.
 *
 * So: a glyph is the subject of what you are looking at and takes
 * `glyphTextSizeClass`; or it is one of many in a row or on a chip and takes
 * the row size through `SubjectGlyph` and `SubjectPill`; or it is one of many
 * on a browsing card, between the two. Three, and `scripts/check-glyph-sizes.mjs`
 * fails on a fourth typed into a className - a surface that truly needs its own
 * shape says so on that script's allow list, with the reason.
 */

/**
 * The primary glyph: the one the surface is about.
 *
 * Measured by length, because a five-character word at a single character's
 * size is a word that runs off a phone. Lived under the level explorer for a
 * year, which is why `SubjectCards` - a shared component - was importing out
 * of a user page's private lib to get it.
 */
export function glyphTextSizeClass(characters: string): string {
  const length = Array.from(characters).length;
  /*
   * The marker rides along with the size. Every caller is sizing a Japanese
   * glyph - that is the only thing this measures - so the two were never
   * separate decisions, and pairing them here is what stops the next glyph
   * surface from taking the sizing and leaving the glyph translatable.
   */
  if (length >= 5) {
    return `${NO_TRANSLATE_CLASS} text-4xl`;
  }
  if (length >= 3) {
    return `${NO_TRANSLATE_CLASS} text-5xl`;
  }
  return `${NO_TRANSLATE_CLASS} text-6xl`;
}

/**
 * The glyph in a row or on a chip: one of many, at a size you can still read.
 *
 * Not measured by length - a row gives every item the same lane, and a lane
 * that resized per item would stop the eye running down the column, which is
 * the only thing a list of five hundred kanji is for.
 */
export const GLYPH_ROW_SIZE_CLASS = "text-2xl";

/**
 * The glyph on a browsing card: bigger than a row, smaller than a page.
 *
 * The density toggle would say nothing if a card and a row drew the same
 * size, and a card is not the subject of the surface the way a heading is.
 */
export const GLYPH_CARD_SIZE_CLASS = "text-3xl";
