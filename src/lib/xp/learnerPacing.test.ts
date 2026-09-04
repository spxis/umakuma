import { describe, expect, it } from "vitest";

import { LEARNER_PROFILES, pacingTable, xpPerActiveDay } from "./learnerPacing";
import { XP_LEVEL_COST, XP_RANKS, xpForLevel } from "./xpCurve";

/**
 * The pacing model, held to the intent behind it.
 *
 * Nobody has used the site yet, so none of this is measurement. Its job is to
 * fail when a change to an award, an interval or the curve moves a real person
 * out of the band the system was designed for — before it ships, rather than
 * after somebody notices they need eleven years.
 */
describe("how long each kind of learner takes", () => {
  const table = pacingTable();
  const by = (id: string) => table.find((row) => row.profile.id === id)!;

  it("reports both ladders for every profile", () => {
    /* Printed on purpose: this is the table John asked to see, and a test is
       the only place it stays true as the numbers move. */
    for (const row of table) {
      console.log(
        `${row.profile.label.padEnd(46)} XP/day ${String(row.xpPerActiveDay).padStart(4)} | ` +
          `rank 100 in ${String(row.yearsToRank100).padStart(4)}y | ` +
          `UK10 in ${String(row.daysToLevel10).padStart(4)}d | UK100 in ${row.yearsToLevel100}y`,
      );
    }
    expect(table).toHaveLength(LEARNER_PROFILES.length);
  });

  it("gets the steady learner to rank 100 in about three years", () => {
    /* John's target. The curve was built against this profile. */
    expect(by("steady").yearsToRank100).toBeGreaterThan(2.4);
    expect(by("steady").yearsToRank100).toBeLessThan(3.6);
  });

  it("keeps every profile's XP ladder inside a decade", () => {
    /* A rank nobody alive will reach is not a carrot, it is a joke. */
    for (const row of table) {
      expect(row.yearsToRank100, row.profile.id).toBeLessThan(10);
    }
  });

  it("rewards the gamer on XP without handing them the curriculum", () => {
    /* The whole reason the ladders are separate. Somebody who turns up for the
       games earns real standing for the habit, and still has to learn the
       kanji to climb the other one. */
    const gamer = by("gamer");
    const steady = by("steady");
    expect(gamer.yearsToRank100).toBeLessThan(steady.yearsToRank100 * 4);
    expect(gamer.yearsToLevel100).toBeGreaterThan(steady.yearsToLevel100 * 2);
  });

  it("lets the weekend learner climb, slower but not hopelessly", () => {
    /* Two long sittings a week is a legitimate way to study, and a system that
       only works for daily users has quietly told them it is not for them. */
    const weekend = by("weekend");
    expect(weekend.yearsToRank100).toBeLessThan(8);
    expect(weekend.daysToLevel10).toBeLessThan(200);
  });

  it("is bounded below by the SRS, not by appetite", () => {
    /* Reaching Guru takes four correct answers over about eight days whatever
       a member does, so nobody buys a curriculum level faster than that - and
       the devoted learner, who does everything, should be sitting on exactly
       that floor rather than beating it. */
    expect(by("devoted").daysToLevel10 / 10).toBeGreaterThanOrEqual(9);
    expect(by("devoted").daysToLevel10 / 10).toBeLessThan(12);
  });

  it("shows the lesson rate, not the schedule, holding back a light user", () => {
    /* Two lessons a day is what makes the gamer slow on the curriculum ladder,
       and that is the model working: they are barely meeting new material. It
       is worth asserting so the cause stays visible if the numbers move. */
    expect(by("gamer").daysToLevel10 / 10).toBeGreaterThan(by("devoted").daysToLevel10 / 10);
  });

  it("makes the last XP ranks cost most of the journey", () => {
    /* Rank 90 to 100 should be worth something. If the top ten ranks were a
       tenth of the ladder they would not feel like an achievement. */
    const lastTen = xpForLevel(XP_RANKS) - xpForLevel(XP_RANKS - 10);
    expect(lastTen / xpForLevel(XP_RANKS)).toBeGreaterThan(0.25);
  });

  it("earns more on a day with more study, at every profile", () => {
    const sorted = [...LEARNER_PROFILES].sort((a, b) => a.reviewsPerDay - b.reviewsPerDay);
    for (let at = 1; at < sorted.length; at += 1) {
      expect(xpPerActiveDay(sorted[at])).toBeGreaterThanOrEqual(xpPerActiveDay(sorted[at - 1]));
    }
  });
});

describe("the shape of the curve itself", () => {
  it("never gets easier, at any rank", () => {
    /* The property the whole design rests on, and the one an earlier version
       broke at exactly the handoff: rank 10 cost 250 and rank 11 cost 83. */
    for (let at = 1; at < XP_LEVEL_COST.length; at += 1) {
      expect(XP_LEVEL_COST[at], `rank ${at + 1} against rank ${at}`).toBeGreaterThanOrEqual(XP_LEVEL_COST[at - 1]);
    }
  });

  it("keeps the first ten ranks flat and cheap", () => {
    /* 25, 50, 75 ... 250. Early progress legible rather than clever. */
    expect(XP_LEVEL_COST.slice(0, 10)).toEqual([25, 50, 75, 100, 125, 150, 175, 200, 225, 250]);
  });

  it("hands off without a step down", () => {
    expect(XP_LEVEL_COST[10]).toBeGreaterThanOrEqual(XP_LEVEL_COST[9]);
  });

  it("compounds after the ramp rather than staying flat", () => {
    /* Otherwise it is a hundred ranks of the same climb, which is the thing
       John said it must not be. */
    expect(XP_LEVEL_COST[99] / XP_LEVEL_COST[10]).toBeGreaterThan(10);
  });

  it("puts rank 1 within a single sitting", () => {
    expect(XP_LEVEL_COST[0]).toBeLessThanOrEqual(30);
  });

  it("prices every rank in fives", () => {
    /* John's rule. 4,310 reads as a number somebody chose; 4,312 reads as one
       a machine produced. */
    for (const [at, cost] of XP_LEVEL_COST.entries()) {
      expect(cost % 5, `rank ${at + 1} costs ${cost}`).toBe(0);
    }
  });

  it("strictly increases, which rounding can break", () => {
    /* Rounding to fives can flatten two neighbours into equality, so this is
       asserted on the stored table rather than trusted of the generator. */
    for (let at = 1; at < XP_LEVEL_COST.length; at += 1) {
      expect(XP_LEVEL_COST[at], `rank ${at + 1}`).toBeGreaterThan(XP_LEVEL_COST[at - 1]);
    }
  });
});
