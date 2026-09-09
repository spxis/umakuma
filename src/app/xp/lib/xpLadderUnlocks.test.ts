import { describe, expect, it } from "vitest";

import { XP_GAME_UNLOCKS, gamesPerDayAt } from "@/lib/xp/xpEntitlements";

import { xpLadderRows } from "./xpLadder";

/*
 * The chart exists to say what the ladder is for, and it listed what every
 * rank costs without ever saying what one buys. The answer was a click deep
 * on a hundred separate rank pages.
 */
describe("what a rung unlocks", () => {
  const rows = xpLadderRows(0);

  it("marks exactly the rungs where the allowance changes", () => {
    const marked = rows.filter((row) => row.unlocksGamesPerDay !== null).map((row) => row.level);

    expect(marked).toEqual(XP_GAME_UNLOCKS.map((unlock) => unlock.rank));
  });

  /*
   * Derived, never typed. The ticket's own reason: a hand-written number is a
   * promise nothing keeps, so the chart has to read the function the games
   * are actually gated on.
   */
  it("prints the allowance the code enforces", () => {
    for (const row of rows) {
      if (row.unlocksGamesPerDay === null) continue;
      expect(row.unlocksGamesPerDay, `rank ${row.level}`).toBe(gamesPerDayAt(row.level));
    }
  });

  /* Ninety-five rungs change nothing, and a hundred rows each repeating the
     same number is noise rather than an answer. */
  it("says nothing on a rung that changes nothing", () => {
    const quiet = rows.filter((row) => row.unlocksGamesPerDay === null);

    expect(quiet.length).toBe(rows.length - XP_GAME_UNLOCKS.length);
    for (const row of quiet) {
      expect(gamesPerDayAt(row.level)).toBe(gamesPerDayAt(row.level - 1));
    }
  });
});
