/**
 * How a list is going.
 *
 * Two questions, kept apart because they answer differently: how much of the
 * list is known, and how well the answering went. A list can be half learned
 * and answered perfectly, or fully unlocked and got wrong half the time, and
 * one number cannot say both.
 *
 * Words rather than letters. This is a list a ten-year-old opens, and "D" is a
 * verdict on a person where "getting there" is a description of a list. The
 * numbers are underneath for anyone who wants them.
 */

export const LIST_GRADES = {
  /** Nothing on it has been started. */
  untouched: "untouched",
  starting: "starting",
  getting: "getting",
  nearly: "nearly",
  /** Every item at Guru or above. */
  solid: "solid",
} as const;

export type ListGrade = (typeof LIST_GRADES)[keyof typeof LIST_GRADES];

/**
 * The share of the list at Guru or above, turned into a word.
 *
 * The thresholds are thirds, so each word covers a stretch a member can feel
 * themselves crossing. `solid` needs all of it: "nearly" that includes 99% is
 * a word nobody would trust the second time they saw it.
 */
export function gradeFor(known: number, total: number): ListGrade {
  if (total <= 0 || known <= 0) return LIST_GRADES.untouched;
  if (known >= total) return LIST_GRADES.solid;
  const share = known / total;
  if (share < 1 / 3) return LIST_GRADES.starting;
  if (share < 2 / 3) return LIST_GRADES.getting;
  return LIST_GRADES.nearly;
}

export type ReviewTally = { correct: number; total: number };

/**
 * How well the answering went, or null when nobody has answered.
 *
 * Null rather than zero, and the difference matters: a list nobody has been
 * reviewed on has no accuracy, while 0% means every answer was wrong. Showing
 * the second when the first is true tells a member they are failing a list
 * they have not sat down with.
 */
export function accuracyOf(tally: ReviewTally): number | null {
  return tally.total > 0 ? tally.correct / tally.total : null;
}

/** A share as a whole-number percentage, for the one place that prints it. */
export function asPercent(share: number): number {
  return Math.round(share * 100);
}

/**
 * Whether the owner's "studied" mark still describes the list.
 *
 * A list marked done in March and added to in June is not done - the mark was
 * about what it held then. Rather than clearing it silently, which loses the
 * fact that somebody did finish it once, the mark is reported as stale and
 * the page says so.
 */
export function markIsStale(studiedAt: string | null, updatedAt: string): boolean {
  return studiedAt !== null && updatedAt > studiedAt;
}
