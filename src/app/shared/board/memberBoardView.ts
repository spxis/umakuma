import type { ReactNode } from "react";

import type { MemberPlacing } from "@/lib/memberBoard";

/**
 * One row of any member board, in the shape the shared list draws.
 *
 * The four boards rank different populations by different numbers - XP lists
 * everybody, WaniKani ends in `onlyConnected`, reading ranks a tracked set -
 * and that difference is real and stays with each board's own loader. What
 * they have in common is the *row*: a placing, a member, a fact under the
 * name, the figure they are ranked by, and the distance to the row above.
 *
 * So this is a view model, not a query. A board loads and filters its own
 * accounts, ranks them with `rankMemberBoard`, and converts to this. Nothing
 * here knows what a board is about.
 */
export type MemberBoardEntry = MemberPlacing & {
  id: string;
  name: string;
  /** Where their pages live, or null for an account with no address yet. */
  address: string | null;
  /** Resolved by the board, which owns the rule about who may open whose pages. */
  href: string | null;
  /** Draws the row as the reader's own. */
  isViewer: boolean;
  /** The second fact, under the name: a rank name, a level badge, a streak. */
  caption: string | null;
  /** The board's own middle lane - a progress bar, a spread, or nothing at all. */
  detail?: ReactNode;
  /** The number this board ranks by, already formatted for reading. */
  figure: string;
  /**
   * Under the figure: what it would take to pass the row above.
   *
   * The board formats it, because only the board knows the unit - "12 XP to
   * pass" is not "2 levels to pass". `memberBoardGap` writes the three cases
   * so no board has to decide again what a leader or a tie says.
   */
  figureNote: string;
};

/** What the shared row list says in place of a number it does not print. */
export type MemberBoardCopy = {
  /** Read out in place of the blank on the repeat rows of a tie. */
  sharedPlace: (place: number) => string;
  you: string;
};

/**
 * The three things the gap under a figure can say.
 *
 * Written once because all four boards have the same three cases and it is
 * the one place a board could quietly get it wrong: `null` and `0` are
 * different facts, and drawing both as a dash says "nothing to do" for a
 * member who is one point behind.
 */
export function memberBoardGap(
  toPassAbove: number | null,
  words: { leading: string; level: string; toPass: (amount: number) => string },
): string {
  if (toPassAbove === null) return words.leading;
  if (toPassAbove === 0) return words.level;
  return words.toPass(toPassAbove);
}
