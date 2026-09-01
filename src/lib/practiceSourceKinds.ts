/**
 * What a practice sheet can be built from, as plain values.
 *
 * These live apart from `practiceSource.ts` because that module reads the
 * database and is `server-only`, while the names are needed to build a link -
 * and a link is built in the browser. Importing the reader for its constants
 * dragged Prisma into the client bundle and took the page down with a 500.
 */

export const PRACTICE_SOURCES = {
  grade: "grade",
  wanikani: "wanikani",
  jlpt: "jlpt",
  /* The member's own lists, which are the sheets most worth printing. */
  trouble: "trouble",
  favorite: "favorite",
  /* Characters chosen by hand on some other surface. */
  picked: "picked",
} as const;

export type PracticeSource = (typeof PRACTICE_SOURCES)[keyof typeof PRACTICE_SOURCES];

/** Sources that read a member's tagged list rather than a fixed ladder. */
export const TAGGED_PRACTICE_SOURCES = [PRACTICE_SOURCES.trouble, PRACTICE_SOURCES.favorite] as const;

export function isTaggedPracticeSource(value: string): boolean {
  return (TAGGED_PRACTICE_SOURCES as readonly string[]).includes(value);
}

export function isPracticeSource(value: string): value is PracticeSource {
  return Object.values(PRACTICE_SOURCES).includes(value as PracticeSource);
}

/**
 * Whether the source is a ladder with levels, rather than a list that is
 * whole. It decides whether an address carries a level at all.
 */
export function practiceSourceHasLevels(source: PracticeSource): boolean {
  return !isTaggedPracticeSource(source) && source !== PRACTICE_SOURCES.picked;
}
