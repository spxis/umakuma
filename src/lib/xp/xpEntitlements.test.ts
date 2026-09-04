import { describe, expect, it } from "vitest";

import { XP_AWARDS, xpAwardValue } from "./xpAwards";
import { entitlementsAt, gamesPerDayAt, nextUnlockAfter, XP_GAMES_PER_DAY_CEILING } from "./xpEntitlements";

/**
 * What a rank buys, and the ceiling that keeps it from buying too much.
 *
 * This is a compounding loop — more games earn more XP, which buys more games
 * — so the assertions here are mostly about it staying bounded.
 */
describe("what an XP rank unlocks", () => {
  it("starts everybody at two games a day", () => {
    expect(gamesPerDayAt(1)).toBe(2);
    expect(gamesPerDayAt(9)).toBe(2);
  });

  it("widens with the rank, and stops", () => {
    expect(gamesPerDayAt(10)).toBe(3);
    expect(gamesPerDayAt(25)).toBe(4);
    expect(gamesPerDayAt(50)).toBe(5);
    expect(gamesPerDayAt(75)).toBe(XP_GAMES_PER_DAY_CEILING);
    expect(gamesPerDayAt(100)).toBe(XP_GAMES_PER_DAY_CEILING);
  });

  it("never lets the ceiling exceed three times the start", () => {
    /* The loop's guard rail. Left open, a rank-90 member would out-earn a
       rank-10 member by an order of magnitude and the economy would bend
       toward whoever grinds hardest. */
    expect(XP_GAMES_PER_DAY_CEILING).toBeLessThanOrEqual(6);
    for (let rank = 1; rank <= 100; rank += 1) {
      expect(gamesPerDayAt(rank), `rank ${rank}`).toBeLessThanOrEqual(XP_GAMES_PER_DAY_CEILING);
    }
  });

  it("never narrows as somebody climbs", () => {
    for (let rank = 2; rank <= 100; rank += 1) {
      expect(gamesPerDayAt(rank), `rank ${rank}`).toBeGreaterThanOrEqual(gamesPerDayAt(rank - 1));
    }
  });

  it("puts the first unlock where a new member will actually reach it", () => {
    /* Rank 10 arrives inside a fortnight. An unlock nobody sees for a year is
       a reward for having already stayed, which is the wrong way round. */
    expect(nextUnlockAfter(1)?.rank).toBe(10);
    expect(nextUnlockAfter(100)).toBeNull();
  });

  it("raises the games cap rather than changing what a game pays", () => {
    const low = xpAwardValue("gameFinished", 10, entitlementsAt(1));
    const high = xpAwardValue("gameFinished", 10, entitlementsAt(75));
    expect(low).toBe(0);
    expect(high).toBe(XP_AWARDS.gameFinished);
  });

  it("falls back to the static cap when nobody's standing is given", () => {
    expect(xpAwardValue("gameFinished", 0)).toBe(XP_AWARDS.gameFinished);
  });
});
