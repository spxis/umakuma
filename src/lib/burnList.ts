/**
 * The Burned list: what a member knows so well they never need to read it.
 *
 * A third built-in list beside Trouble and Favourites, and unlike them a
 * filter over everything else - applied, it takes its items out of any list
 * being read or practised. It starts empty for everyone; a member with
 * WaniKani connected can apply their WaniKani burned items to it, when they
 * choose, as often as they like. These are the two rules as maths.
 */

/** WaniKani's SRS stage for burned: past enlightened, never reviewed again. */
export const WANIKANI_BURNED_STAGE = 9;

/** The subjects WaniKani has burned, once each, from the account's assignments. */
export function burnedCandidates(assignments: Iterable<{ subjectId: number; srsStage: number }>): number[] {
  const ids = new Set<number>();
  for (const assignment of assignments) {
    if (assignment.srsStage >= WANIKANI_BURNED_STAGE) ids.add(assignment.subjectId);
  }
  return [...ids];
}

/** The rows left when the burned ones are taken out, and how many went. */
export function withoutBurned<T extends { subjectId: number | null }>(
  rows: T[],
  burnedIds: ReadonlySet<number>,
): { kept: T[]; hidden: number } {
  if (burnedIds.size === 0) return { kept: rows, hidden: 0 };
  const kept = rows.filter((row) => row.subjectId === null || !burnedIds.has(row.subjectId));
  return { kept, hidden: rows.length - kept.length };
}
