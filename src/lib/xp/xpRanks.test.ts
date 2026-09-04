import { describe, expect, it } from "vitest";

import { XP_RANKS } from "./xpCurve";
import { xpRank, xpRankEquivalents, xpRankName, xpRanks, xpRanksAreNamed } from "./xpRanks";

/**
 * The names arrive on their own schedule.
 *
 * A hundred rank names with nine equivalents apiece is writing rather than
 * code, and it lands in `src/data/xpRankNames.json` independently of anything
 * here. So what this holds is that the reader is *useful* when the file is
 * complete and *harmless* when it is not: no throw, no blank, and an answer
 * for every level either way.
 */
describe("the XP rank names", () => {
  it("answers for every rank on the ladder, named or not", () => {
    const all = xpRanks();
    expect(all).toHaveLength(XP_RANKS);
    for (const rank of all) {
      expect(rank.name.length, `rank ${rank.level}`).toBeGreaterThan(0);
    }
  });

  it("falls back to the rank number rather than throwing on a name it lacks", () => {
    /* True until the file is finished, and the assertion has to hold either
       way - so it is written against whichever ranks are still unnamed. */
    const unnamed = xpRanks().find((rank) => rank.name === `Rank ${rank.level}`);
    if (unnamed) {
      expect(unnamed.equivalents).toEqual([]);
    }
    expect(xpRankName(XP_RANKS)).toMatch(/\S/);
  });

  it("clamps a level that is off the ladder instead of returning nothing", () => {
    expect(xpRank(0).level).toBe(1);
    expect(xpRank(-5).level).toBe(1);
    expect(xpRank(XP_RANKS + 40).level).toBe(XP_RANKS);
    expect(xpRank(Number.NaN).level).toBe(1);
    expect(xpRank(7.8).level).toBe(7);
  });

  it("starts at Rookie once the file has been written that far", () => {
    /* Level 1 is the one name that was fixed before the list was started. */
    expect(xpRankName(1)).toBe("Rookie");
  });

  it("hands back the equivalents, and an empty list rather than undefined", () => {
    const first = xpRankEquivalents(1);
    expect(Array.isArray(first)).toBe(true);
    for (const equivalent of first) {
      expect(equivalent.name.length).toBeGreaterThan(0);
      expect(typeof equivalent.language).toBe("string");
      expect(typeof equivalent.note).toBe("string");
    }
    expect(xpRankEquivalents(XP_RANKS + 100)).toEqual(xpRankEquivalents(XP_RANKS));
  });

  it("says plainly whether the names have all landed", () => {
    /* Not an assertion that they have - this is what a later check, or a
       person, asks rather than counting rows itself. */
    expect(typeof xpRanksAreNamed()).toBe("boolean");
  });
});
