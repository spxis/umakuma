/**
 * What a saved list may be called and may contain.
 *
 * Split out of `studyLists.ts` because that file is `server-only` and these
 * rules are needed on both sides: the input that names a list has to cap at the
 * same length the route enforces, or a member types a name that is silently
 * truncated after they press save.
 */

export const STUDY_LIST_LIMITS = {
  /** Enough for "Week 37 - the ones he keeps missing" and not enough to hide a paragraph. */
  nameLength: 60,
  /** The same cap the selection carries, since a list is a saved selection. */
  characters: 200,
  /** Per member, so a runaway client cannot fill the table. */
  perAccount: 100,
} as const;

export type StudyListSummary = {
  id: string;
  name: string;
  characters: string[];
  updatedAt: string;
};

/** Trimmed, deduplicated and capped - the shape the database should hold. */
export function normalizeListCharacters(raw: string[]): string[] {
  const seen = new Set<string>();
  for (const value of raw) {
    for (const character of Array.from(value)) {
      if (seen.size >= STUDY_LIST_LIMITS.characters) break;
      if (character.trim()) seen.add(character);
    }
  }
  return [...seen];
}

/**
 * A name as it will be stored, or null if there is nothing left of it.
 *
 * Inner whitespace is collapsed as well as trimmed, so "Week  1" and "Week 1"
 * are the same list rather than two. That matters more than it looks: the
 * unique key is the name, so a stray double space is how a member ends up with
 * two lists they cannot tell apart on the page.
 *
 * Capped by code point rather than by slicing the string, because a name may
 * hold kanji outside the Basic Multilingual Plane and cutting at 60 UTF-16
 * units can land in the middle of one.
 */
export function normalizeListName(raw: string): string | null {
  const collapsed = raw.replace(/\s+/g, " ").trim();
  if (!collapsed) return null;
  return Array.from(collapsed).slice(0, STUDY_LIST_LIMITS.nameLength).join("");
}

/**
 * A missing table is survivable.
 *
 * This repo applies schema by hand, so code can reach production a moment
 * before the table does. Everywhere a list is only decoration - a count, a
 * menu of saved sheets - an empty answer is far better than a 500 that takes
 * the whole page down with it.
 */
export function isMissingStudyListTableError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === "P2021" || code === "P2022";
}

/**
 * The name is already on another of this member's lists.
 *
 * `@@unique([accountId, name])` is what makes saving twice under one name an
 * update rather than a fork, and it is the same constraint a rename runs into.
 * Renaming has no sensible merge, so this becomes a 409 the member can act on
 * instead of a 500 they cannot.
 */
export function isDuplicateListNameError(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === "P2002";
}
