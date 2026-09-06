import { XP_RANKS, xpForLevel } from "@/lib/xp/xpCurve";
import { gamesPerDayAt } from "@/lib/xp/xpEntitlements";
import { xpRank } from "@/lib/xp/xpRanks";

import type { XpBoardEntry } from "./xpBoard";

/**
 * One rank's own board.
 *
 * SPX gave every level a leaderboard of its own, reached by clicking the level
 * in the chart, and it is the thing that made a 22-row table worth reading:
 * the chart says what a rank costs, and the rank says who is standing there.
 *
 * The whole board is already loaded and placed by the time this runs, so this
 * is a filter rather than a query - and the placings deliberately stay the
 * *board's* placings. Somebody who is 41st overall is 41st here too, not
 * renumbered to 3rd, because their place is a fact about the site and not
 * about the page they are being read on.
 */
export type XpRankBoard = {
  level: number;
  name: string;
  /** What this rank asks for, and what the next one does. Null at the top. */
  needs: number;
  nextNeeds: number | null;
  nextName: string | null;
  /** What standing here buys, from `xpEntitlements` rather than a second list. */
  gamesPerDay: number;
  entries: XpBoardEntry[];
};

export function isXpRankLevel(value: unknown): value is number {
  const level = Number(value);
  return Number.isInteger(level) && level >= 1 && level <= XP_RANKS;
}

export function xpRankBoard(entries: readonly XpBoardEntry[], level: number): XpRankBoard {
  const atTop = level >= XP_RANKS;
  return {
    level,
    name: xpRank(level).name,
    needs: xpForLevel(level),
    nextNeeds: atTop ? null : xpForLevel(level + 1),
    nextName: atTop ? null : xpRank(level + 1).name,
    gamesPerDay: gamesPerDayAt(level),
    entries: entries.filter((entry) => entry.standing.level === level),
  };
}
