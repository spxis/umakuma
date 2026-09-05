import { XP_LEVEL_COST, XP_RANKS, xpForLevel, xpLevelFor } from "@/lib/xp/xpCurve";
import { xpRankName } from "@/lib/xp/xpRanks";

/**
 * The whole ladder, one row a rank, for the chart beside the board.
 *
 * The board answers "who is ahead of me"; this answers "how much further is
 * anything". They are the same question asked from opposite ends, which is why
 * they sit in two columns of one page rather than on two pages.
 *
 * Pure, and separate from the drawing, for the reason `xpBoard.ts` is: the
 * arithmetic of a ladder has edge cases worth a test - rank 1 costs nothing
 * because it is where everybody starts, and the top rank has no next - and the
 * markup has none.
 *
 * `cost` is what a rank asks for on its own and `total` is what standing there
 * has cost in all. Both are shown, because they answer different questions: a
 * member deciding whether tonight's reviews will move them reads the cost, and
 * a member wondering what rank 50 means reads the total.
 */

export type XpLadderState = "behind" | "here" | "ahead";

export type XpLadderRow = {
  level: number;
  name: string;
  /** What this rank asks for on its own. Zero at rank 1. */
  cost: number;
  /** XP needed to stand here at all. */
  total: number;
  /** Where the viewer stands against this rung. */
  state: XpLadderState;
  /** 0-1 against the dearest rank, so a bar needs no second pass. */
  share: number;
};

/**
 * The dearest rank, which every bar is drawn against.
 *
 * The costs a rung is actually charged, not the whole table. Rank 1 is free,
 * so a hundred ranks need ninety-nine prices and `XP_LEVEL_COST` carries a
 * hundred - its last entry is the price of a rank 101 that does not exist, and
 * `xpForLevel` never reads it either. Scaling against it would leave the
 * dearest real rung at 96% of the bar for no reason a reader could see.
 */
const DEAREST = XP_LEVEL_COST.slice(0, XP_RANKS - 1).reduce((most, cost) => Math.max(most, cost), 0);

/**
 * Every rank, cheapest first.
 *
 * `xp` is the viewer's total, or null for a visitor with no account - in which
 * case no row is marked and the chart is simply the ladder, which is what a
 * visitor came to read.
 */
export function xpLadderRows(xp: number | null): XpLadderRow[] {
  const standing = xp === null ? null : xpLevelFor(xp);

  return XP_LEVEL_COST.map((_, index) => {
    const level = index + 1;
    /* Rank 1 is where everybody starts, so it asks for nothing. The table's
       first entry is the cost of reaching rank 2, and reading it as rank 1's
       price is the mistake this offset exists to prevent. */
    const cost = level === 1 ? 0 : XP_LEVEL_COST[index - 1];
    return {
      level,
      name: xpRankName(level),
      cost,
      total: xpForLevel(level),
      state: ladderState(level, standing),
      share: DEAREST === 0 ? 0 : cost / DEAREST,
    };
  });
}

function ladderState(level: number, standing: number | null): XpLadderState {
  if (standing === null) return "ahead";
  if (level === standing) return "here";
  return level < standing ? "behind" : "ahead";
}

/**
 * The handful of rungs worth naming on a summary line.
 *
 * Ten, twenty-five, fifty and the top: far enough apart to describe a shape
 * without listing it, and the same four somebody would pick by hand.
 */
export const XP_LADDER_MILESTONES: readonly number[] = [10, 25, 50, XP_RANKS];

/** The rung a member is on, the one behind it and the one ahead. */
export type XpLadderNeighbours = {
  previous: XpLadderRow | null;
  here: XpLadderRow;
  next: XpLadderRow | null;
};

/**
 * The three rungs that answer "where am I", pulled out of the hundred.
 *
 * A hundred rows in a box that shows fourteen means the one row that is marked
 * is usually the one row a member cannot see. Standing the three at the top
 * answers it before the table is scrolled at all - and does it on the server,
 * where an effect that scrolled the box to the right row would have needed the
 * page's only piece of client code.
 *
 * Null for a visitor with no account: there is no rung to stand on, and the
 * ladder on its own is what they came to read.
 */
export function xpLadderNeighbours(rows: readonly XpLadderRow[]): XpLadderNeighbours | null {
  const index = rows.findIndex((row) => row.state === "here");
  if (index < 0) return null;
  return {
    previous: rows[index - 1] ?? null,
    here: rows[index],
    next: rows[index + 1] ?? null,
  };
}
