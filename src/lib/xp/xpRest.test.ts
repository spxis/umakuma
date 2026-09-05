import { describe, expect, it } from "vitest";

import { XP_RANKS } from "./xpCurve";
import {
  MAX_VACATION_DAYS_AT_ONCE,
  nextRestUnlockAfter,
  restDaysAllowedAt,
  restStanding,
  vacationWeeksAllowedAt,
} from "./xpRest";

describe("what a rank earns you in time off", () => {
  it("gives everybody a full week from the start", () => {
    /* Deliberately generous. An allowance that runs out in February teaches a
       member that the streak is a trap, and a member who believes that stops
       looking at it - at which point it has stopped doing its only job. */
    expect(restDaysAllowedAt(1)).toBe(7);
  });

  it("widens with the rank", () => {
    expect(restDaysAllowedAt(10)).toBe(12);
    expect(restDaysAllowedAt(50)).toBe(26);
    expect(restDaysAllowedAt(XP_RANKS)).toBe(36);
  });

  it("takes tuned rules over the built-in defaults", () => {
    /* The constants are what a fresh environment starts with; the live rules
       come from SiteSetting so generosity can be adjusted without a deploy. */
    const tuned = [{ rank: 1, days: 100 }];
    expect(restDaysAllowedAt(1, tuned)).toBe(100);
  });

  it("never narrows as somebody climbs", () => {
    for (let rank = 2; rank <= XP_RANKS; rank += 1) {
      expect(restDaysAllowedAt(rank), `rank ${rank}`).toBeGreaterThanOrEqual(restDaysAllowedAt(rank - 1));
      expect(vacationWeeksAllowedAt(rank), `rank ${rank}`).toBeGreaterThanOrEqual(vacationWeeksAllowedAt(rank - 1));
    }
  });

  it("opens vacation early, where it is most needed", () => {
    /* The member most likely to be lost to a fortnight away is the new one,
       not the one with a year invested. */
    expect(vacationWeeksAllowedAt(4)).toBe(0);
    expect(vacationWeeksAllowedAt(5)).toBe(2);
    expect(vacationWeeksAllowedAt(XP_RANKS)).toBe(10);
  });

  it("fits a real trip inside one booking", () => {
    /* Six weeks, so a long holiday is not taken in instalments. */
    expect(MAX_VACATION_DAYS_AT_ONCE).toBe(42);
  });

  it("says what is left rather than what is spent", () => {
    const standing = restStanding({ xpLevel: 50, restDaysUsed: 3, vacationDaysUsed: 7, onVacation: false });
    expect(standing).toMatchObject({ restDaysLeft: 23, vacationDaysLeft: 35, vacationWeeksAllowed: 6 });
  });

  it("never reports a negative allowance", () => {
    /* An allowance can be exceeded by an admin grant or a rank that fell; the
       member should read zero, not minus three. */
    const standing = restStanding({ xpLevel: 1, restDaysUsed: 9, vacationDaysUsed: 30, onVacation: true });
    expect(standing.restDaysLeft).toBe(0);
    expect(standing.vacationDaysLeft).toBe(0);
  });

  it("points at whichever unlock comes first", () => {
    /* Vacation now opens at rank 5, before the next rest-day tier at 10, so
       the nearer of the two is what a member should be told about. */
    expect(nextRestUnlockAfter(1)).toEqual({ rank: 5, weeks: 2 });
    expect(nextRestUnlockAfter(5)).toEqual({ rank: 10, days: 12 });
    expect(nextRestUnlockAfter(XP_RANKS)).toBeNull();
  });
});

describe("rules that can be tuned without a deploy", () => {
  it("reads the defaults when nothing is stored", async () => {
    const { parseTimeOffRules, DEFAULT_TIME_OFF_RULES } = await import("./xpRestSettings");
    expect(parseTimeOffRules(null)).toEqual(DEFAULT_TIME_OFF_RULES);
  });

  it("falls back to the defaults rather than crashing on a broken setting", async () => {
    /* Somebody's holiday should not be cancelled by a malformed row. */
    const { parseTimeOffRules, DEFAULT_TIME_OFF_RULES } = await import("./xpRestSettings");
    expect(parseTimeOffRules("{not json")).toEqual(DEFAULT_TIME_OFF_RULES);
    expect(parseTimeOffRules('{"restDays":"nope"}').restDays).toEqual(DEFAULT_TIME_OFF_RULES.restDays);
  });

  it("sorts tiers by rank, since the lookup walks them in order", async () => {
    /* A hand-edited setting is exactly where an out-of-order tier appears. */
    const { parseTimeOffRules } = await import("./xpRestSettings");
    const rules = parseTimeOffRules(
      JSON.stringify({ restDays: [{ rank: 50, days: 20 }, { rank: 1, days: 5 }] }),
    );
    expect(rules.restDays.map((tier) => tier.rank)).toEqual([1, 50]);
  });
});
