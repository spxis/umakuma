/**
 * Japanese that machine translation must leave alone.
 *
 * Chrome offers to translate any page whose language it can guess, and on a
 * kanji site it takes the offer literally: on the practice sheet it replaced
 * 一 with "one", 右 with "right" and 雨 with "rain", turning a tracing sheet
 * into English words beside squares nobody could tell apart. It romanised the
 * readings too - イチ、イツ came back as "Ichi, Ittsu".
 *
 * This is per-element rather than the page-level
 * `<meta name="google" content="notranslate">`, deliberately. Somebody reading
 * over a learner's shoulder should still be able to translate the chrome - the
 * buttons, the instructions, the English meanings. What can never be touched is
 * the Japanese itself, because that is not the language the page is written in,
 * it is the subject the page is teaching.
 *
 * Both spellings, because engines honour different ones: `translate="no"` is
 * the HTML5 attribute and `notranslate` is Google's older class. `lang="ja"` is
 * not one of them - it tells a translator what it is reading, which is an
 * invitation rather than a refusal.
 */
export const NO_TRANSLATE_CLASS = "notranslate";

/**
 * The Japanese font and the marker, which travel together.
 *
 * Anything rendered in the Japanese font is Japanese, so the two were never
 * really separate decisions - and keeping them in one constant is what stops
 * the next glyph surface from picking up the font and forgetting the marker.
 * A unit test holds the raw font literal out of the rest of the tree.
 */
export const JP_TEXT_CLASS = `${NO_TRANSLATE_CLASS} [font-family:var(--font-jp-current)]`;

/** Adds the marker to an element that already has classes of its own. */
export function noTranslateClass(className?: string): string {
  return className ? `${NO_TRANSLATE_CLASS} ${className}` : NO_TRANSLATE_CLASS;
}

/** Spread onto an element whose text is Japanese and which has no class. */
export const noTranslate = { translate: "no", className: NO_TRANSLATE_CLASS } as const;
