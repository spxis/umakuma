import { PRACTICE_SOURCES, isPracticeSource, isTaggedPracticeSource, type PracticeSource } from "@/lib/practiceSource";

/**
 * Where a practice sheet lives.
 *
 * Practice sat under the grades explorer, at `/grades/practice?source=jlpt`,
 * which read as though grades owned it. It never did: it builds sheets from
 * school grades, WaniKani levels, JLPT levels, either tagged list, or a set
 * picked by hand on any surface. It is the thing you do to a collection, not a
 * page belonging to one of them.
 *
 * So it is addressed as what it is: `/practice` to choose, then the collection
 * in the path — `/practice/jlpt/5`, `/practice/grade/2`, `/practice/trouble`.
 * How the sheet is printed (model characters, readings, squares per page)
 * stays in the query, because that is how you are practising rather than what.
 */

export type PracticeTarget = {
  source: PracticeSource;
  /** The level or grade within the source; null for a list, which has none. */
  level: number | null;
};

/** What `/practice` on its own means: choose something. */
export const PRACTICE_CHOOSING: PracticeTarget | null = null;

/**
 * The target named by the path, `null` to choose, `"invalid"` for nonsense.
 *
 * A wrong address returns a 404 rather than quietly opening a default sheet,
 * for the same reason `/grades/nonsense` does: a broken link should not look
 * like a working one.
 */
export function parsePracticeTarget(segments: string[] | undefined): PracticeTarget | null | "invalid" {
  const parts = (segments ?? []).filter((part) => part.length > 0);
  if (parts.length === 0) return PRACTICE_CHOOSING;

  const [source, level, ...rest] = parts;
  if (rest.length > 0 || !source || !isPracticeSource(source)) return "invalid";

  /* A list is the whole set; a level would mean nothing on one. */
  if (isTaggedPracticeSource(source) || source === PRACTICE_SOURCES.picked) {
    return level === undefined ? { source, level: null } : "invalid";
  }

  if (level === undefined) return "invalid";
  const parsed = Number.parseInt(level, 10);
  if (!Number.isInteger(parsed) || parsed < 1) return "invalid";

  return { source, level: parsed };
}

/** The address of a sheet, or of the chooser when no source is given. */
export function practiceHref(nickname: string, target?: PracticeTarget): string {
  const base = `/users/${encodeURIComponent(nickname)}/practice`;
  if (!target) return base;
  return target.level === null ? `${base}/${target.source}` : `${base}/${target.source}/${target.level}`;
}
