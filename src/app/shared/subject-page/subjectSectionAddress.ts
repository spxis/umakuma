/**
 * A part of a subject, at an address of its own.
 *
 * A subject page answers everything about a character, a radical or a word at
 * one address, which makes it the wrong thing to send somebody when the answer
 * is one part of it. Each block a page draws is reachable on its own -
 * `/kanji/魔/stroke` is the stroke order and nothing else, `/radicals/leaf/related`
 * the kanji built from it - so a link can carry the part that was worth
 * pointing at.
 *
 * One vocabulary for all three pages, because they are built from the same
 * blocks and a reader who learns the segment on one should be right on the
 * next. Which sections a page actually has is its own registry's business;
 * this module is only the address, kept apart from the JSX so a link can be
 * built anywhere without pulling a page's imports along with it.
 */

export const SUBJECT_SECTIONS = {
  stroke: "stroke",
  /** The radicals a character is written with, from RADKFILE. */
  parts: "parts",
  meanings: "meanings",
  words: "words",
  related: "related",
  /** The characters this one is mistaken for. Kanji only. */
  confusables: "confusables",
  mnemonics: "mnemonics",
  examples: "examples",
} as const;

export type SubjectSection = (typeof SUBJECT_SECTIONS)[keyof typeof SUBJECT_SECTIONS];

export function isSubjectSection(value: string): value is SubjectSection {
  return (Object.values(SUBJECT_SECTIONS) as string[]).includes(value);
}

/** The whole subject, which is what `/kanji/魔` on its own means. */
export const WHOLE_SUBJECT_PAGE = null;

/**
 * The section named by the path: null for the whole page, `"invalid"` for a
 * segment that names nothing.
 *
 * A wrong segment is a 404 rather than a quiet fall back to the whole page,
 * for the reason `/practice/nonsense` is: a broken link that renders something
 * looks like a working one, and nobody fixes it.
 */
export function parseSubjectSection(segments: string[] | undefined): SubjectSection | null | "invalid" {
  const parts = (segments ?? []).filter((part) => part.length > 0);
  if (parts.length === 0) return WHOLE_SUBJECT_PAGE;
  if (parts.length > 1) return "invalid";

  const [segment] = parts;
  const decoded = (() => {
    try {
      return decodeURIComponent(segment!);
    } catch {
      return segment!;
    }
  })();

  return isSubjectSection(decoded) ? decoded : "invalid";
}

/**
 * The address of a subject, or of one part of it.
 *
 * `base` is the subject's own page - `/kanji/魔`, `/radicals/leaf`,
 * `/vocabulary/%E6%B0%B4%E6%B3%A1` - already escaped by whoever built it, since
 * the three pages name a subject in three different ways.
 */
export function subjectSectionHref(base: string, section?: SubjectSection | null): string {
  return section ? `${base}/${section}` : base;
}

/** A kanji's own page, which is the one address built from a bare character. */
export function kanjiPageHref(character: string): string {
  return `/kanji/${encodeURIComponent(character)}`;
}
