/**
 * How every board in UmaKuma places its members.
 *
 * There are four boards over one idea - WaniKani, UmaKuma, XP and reading -
 * and before this they placed people three different ways. The XP board used
 * competition ranking; the WaniKani board computed a rank separately from its
 * display sort with a four-key tiebreak; the reading board printed
 * `index + 1` and had no tie handling at all, so two members on the same total
 * silently became first and second. That is three answers to one question, and
 * the reading board's answer was wrong.
 *
 * **Competition ranking, everywhere.** Equal scores share a place and the next
 * placing skips, the way a race is scored: two members on 1,200 are both
 * second and the next is fourth. Dense ranking - where the next is third -
 * reads as though somebody was overtaken by a total they matched.
 *
 * Two things come out of the walk that a board cannot compute from its rows
 * alone, and both were asked for by name:
 *
 * - `sharesPlace` is true on the second and later rows of a tie. SPX printed
 *   the place on the first row of a tie and left the rest blank, which is what
 *   makes a shared place legible rather than looking like a numbering bug.
 * - `toPassAbove` is the distance to the member directly above, which is what
 *   turns a leaderboard from a list into a target. It is null for the leader,
 *   who has nobody above, and zero for a row that is level with the one above
 *   - and those are different facts, so they are different values rather than
 *   both being drawn as a dash.
 */

/** What a board needs to know about a row beyond the row itself. */
export type MemberPlacing = {
  /** Competition placing: equal scores share it, and the next one skips. */
  place: number;
  /** True when this row repeats the place above, so the number is not printed twice. */
  sharesPlace: boolean;
  /**
   * How much more it would take to pass the member directly above.
   *
   * Null for the leader - there is nobody to pass - and 0 for a row already
   * level with the one above it. A board that drew both as a dash would be
   * saying "nothing to do" in one case and "you are there" in the other.
   */
  toPassAbove: number | null;
};

export type MemberPlaced<T> = T & MemberPlacing;

/**
 * Places rows on a board, best first.
 *
 * `score` is what ranks them and `tiebreak` is what orders equal scores - a
 * name, so the order is stable rather than whatever the database returned.
 * Ties still *share* a place; the tiebreak only decides which of them is drawn
 * first.
 */
export function rankMemberBoard<T>(
  rows: readonly T[],
  read: { score: (row: T) => number; tiebreak: (row: T) => string },
): MemberPlaced<T>[] {
  const sorted = [...rows].sort(
    (left, right) =>
      read.score(right) - read.score(left) ||
      read.tiebreak(left).localeCompare(read.tiebreak(right)),
  );

  let place = 0;
  let previous: number | null = null;

  return sorted.map((row, index) => {
    const score = read.score(row);
    const sharesPlace = previous !== null && score === previous;
    if (!sharesPlace) {
      place = index + 1;
      previous = score;
    }

    const above = index === 0 ? null : read.score(sorted[index - 1]!);
    return {
      ...row,
      place,
      sharesPlace,
      /* Never negative: the list is sorted, so the row above always scores at
         least as much, and Math.max only guards against a caller whose `score`
         is not the value it sorted by. */
      toPassAbove: above === null ? null : Math.max(0, above - score),
    };
  });
}

/** Where one member stands on a board already placed, or null when they are not on it. */
export function memberPlacement<T extends { id: string }>(
  rows: readonly MemberPlaced<T>[],
  accountId: string | null,
): MemberPlaced<T> | null {
  if (!accountId) return null;
  return rows.find((row) => row.id === accountId) ?? null;
}
