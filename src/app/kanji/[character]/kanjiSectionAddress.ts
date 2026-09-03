/**
 * A part of a character, at an address of its own.
 *
 * The kanji page answers everything about a character at one address, which
 * makes it the wrong thing to send somebody when the answer is one part of it.
 * Each block the page draws is reachable on its own - `/kanji/魔/stroke` is the
 * stroke order and nothing else - so a link can carry the part that was worth
 * pointing at.
 *
 * The blocks are declared once, in `kanjiSections.tsx`, and the whole page and
 * a single-section page draw the same ones; this module is only the address,
 * kept apart from the JSX so a link can be built anywhere without pulling the
 * page's imports along with it.
 */

export const KANJI_SECTIONS = {
  stroke: "stroke",
  meanings: "meanings",
  words: "words",
  related: "related",
  mnemonics: "mnemonics",
  examples: "examples",
} as const;

export type KanjiSection = (typeof KANJI_SECTIONS)[keyof typeof KANJI_SECTIONS];

/** Down the page, so a section page's siblings are offered in the order they are met. */
export const KANJI_SECTION_ORDER: readonly KanjiSection[] = [
  KANJI_SECTIONS.stroke,
  KANJI_SECTIONS.meanings,
  KANJI_SECTIONS.words,
  KANJI_SECTIONS.related,
  KANJI_SECTIONS.mnemonics,
  KANJI_SECTIONS.examples,
];

export function isKanjiSection(value: string): value is KanjiSection {
  return (Object.values(KANJI_SECTIONS) as string[]).includes(value);
}

/** The whole character, which is what `/kanji/魔` on its own means. */
export const KANJI_WHOLE_PAGE = null;

/**
 * The section named by the path: null for the whole page, `"invalid"` for a
 * segment that names nothing.
 *
 * A wrong segment is a 404 rather than a quiet fall back to the whole page,
 * for the reason `/practice/nonsense` is: a broken link that renders something
 * looks like a working one, and nobody fixes it.
 */
export function parseKanjiSection(segments: string[] | undefined): KanjiSection | null | "invalid" {
  const parts = (segments ?? []).filter((part) => part.length > 0);
  if (parts.length === 0) return KANJI_WHOLE_PAGE;
  if (parts.length > 1) return "invalid";

  const [segment] = parts;
  const decoded = (() => {
    try {
      return decodeURIComponent(segment!);
    } catch {
      return segment!;
    }
  })();

  return isKanjiSection(decoded) ? decoded : "invalid";
}

/** The address of a character, or of one part of it. */
export function kanjiSectionHref(character: string, section?: KanjiSection | null): string {
  const base = `/kanji/${encodeURIComponent(character)}`;
  return section ? `${base}/${section}` : base;
}
