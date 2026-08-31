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
 * Three layers, which is what the spec actually asks for:
 *
 *   `<html lang="en">`   the document is English - true, and set in the layout
 *   `lang="ja"`          this run is the exception, and is Japanese
 *   `translate="no"`     and do not translate it
 *
 * The middle one is the layer that was missing, and it is the one that stops
 * the mis-detection rather than papering over it. `lang="en"` on its own is
 * necessary and not sufficient: a browser overrides a declared language it does
 * not believe, and a page this full of kanji reads as Japanese, so Chrome
 * offered to translate it *into English* and pushed the English through a
 * Japanese-to-English model on the way. That is how "Writing practice" came
 * back "First practice". Tagging the Japanese as Japanese leaves English prose
 * surrounded by declared-Japanese islands, which is what it is.
 *
 * It earns its keep twice over: a screen reader reads a `lang="ja"` run with
 * Japanese pronunciation instead of spelling kanji out as English.
 *
 * Both refusal spellings, because engines honour different ones: `translate="no"`
 * is the HTML5 attribute and `notranslate` is Google's older class.
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

/**
 * All three layers for an element whose text really is Japanese.
 *
 * Distinct from `noTranslate`, which is for the things that must not be
 * translated but are not Japanese either - a count, an SRS stage, "L17".
 * Declaring those `lang="ja"` would be a lie, and would tell a screen reader
 * to read "L17" in Japanese.
 */
export const japaneseText = {
  lang: "ja",
  translate: "no",
  className: NO_TRANSLATE_CLASS,
} as const;

/** The same, for an element that already has classes of its own. */
export function japaneseTextProps(className?: string) {
  return { lang: "ja", translate: "no" as const, className: noTranslateClass(className) };
}
