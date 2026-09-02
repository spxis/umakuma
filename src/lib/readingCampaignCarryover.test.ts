import { describe, expect, it } from "vitest";

import { carryOverPlan, rulesForTarget, rulesForWindow, targetForRules, weeksInWindow } from "./readingCampaignCarryover";
import type { ReadingChallengeScoringRules } from "./readingChallengeRules";

/**
 * What a new campaign inherits from the one before it.
 *
 * The engine scores a day against `weeklyCaps[floor(daysSinceStart / 7)]`, so
 * a campaign with too few caps scores its last week against nothing - and
 * that is exactly the mistake a hand-typed array makes when a four-week
 * campaign becomes a fourteen-week one.
 */
const JULY: ReadingChallengeScoringRules = {
  weeklyCaps: [5040, 5760, 6480, 6840],
  weeklyPerfectScore: 11.5,
  baseHalfCreditScore: 1,
  streak: { incrementPerPerfectDay: 0.1, maxMultiplier: 1.6, resetEachWeek: true },
  thresholds: { pages: 7, minutes: 7 },
  bonuses: {
    weeklyCapYen: [1372, 1470, 1568, 1666],
    pages: { threshold: 16, yen: 750 },
    minutes: { threshold: 30, yen: 2250 },
    zeroReviews: { enabled: true, yen: 550 },
    catchupStrongFinish: { enabled: true, strongFinishPerfectDays: 3, requiresEarlierFailureInWeek: false, yenPerStrongFinishDay: 1500 },
  },
};

describe("how many weeks a window needs", () => {
  /* The July campaign: 21 July to 18 August, 28 days after the start, four weeks. */
  it("matches the campaign that was made by hand", () => {
    expect(weeksInWindow("2026-07-21", "2026-08-18")).toBe(5);
    expect(weeksInWindow("2026-07-21", "2026-08-17")).toBe(4);
  });

  /* 1 September to 6 December: day 96 sits in week 13, so fourteen caps. */
  it("counts the week the last day lands in", () => {
    expect(weeksInWindow("2026-09-01", "2026-12-06")).toBe(14);
  });

  it("refuses a window that ends before it starts", () => {
    expect(() => weeksInWindow("2026-09-01", "2026-08-31")).toThrow(/before/);
  });
});

describe("the rules, sized to the window", () => {
  const winter = rulesForWindow(JULY, 14);

  it("holds the caps flat at the previous final week, one per week", () => {
    expect(winter.weeklyCaps).toHaveLength(14);
    expect(new Set(winter.weeklyCaps)).toEqual(new Set([6840]));
    expect(winter.bonuses.weeklyCapYen).toHaveLength(14);
    expect(new Set(winter.bonuses.weeklyCapYen)).toEqual(new Set([1666]));
  });

  it("changes nothing else", () => {
    expect(winter.thresholds).toEqual(JULY.thresholds);
    expect(winter.bonuses.pages).toEqual(JULY.bonuses.pages);
    expect(winter.streak).toEqual(JULY.streak);
    expect(winter.weeklyPerfectScore).toBe(JULY.weeklyPerfectScore);
  });

  it("keeps both weekly arrays the same length, which the schema demands", () => {
    expect(winter.weeklyCaps.length).toBe(winter.bonuses.weeklyCapYen.length);
  });

  it("sets the target from the caps, to the nearest thousand", () => {
    expect(targetForRules(winter)).toBe(96_000);
    expect(targetForRules(JULY)).toBe(25_000);
  });

  it("refuses more weeks than the schema allows", () => {
    expect(() => rulesForWindow(JULY, 25)).toThrow(/between 1 and 24/);
  });
});

describe("the rules, sized to a target someone decided", () => {
  /* The Winter campaign: fourteen weeks, and John said ¥40,000, not the ¥96,000 the flat carry-over came to. */
  const winter = rulesForTarget(JULY, 14, 40_000);

  it("adds up to the target exactly, so a perfect reader reaches it on the goal date", () => {
    expect(winter.weeklyCaps).toHaveLength(14);
    expect(winter.weeklyCaps.reduce((sum, cap) => sum + cap, 0)).toBe(40_000);
    expect(targetForRules(winter)).toBe(40_000);
  });

  it("spreads it flat in tens of yen, with the rounding paid in the final week", () => {
    expect(winter.weeklyCaps.slice(0, 13)).toEqual(Array.from({ length: 13 }, () => 2850));
    expect(winter.weeklyCaps[13]).toBe(2950);
  });

  it("keeps the bonus in the previous campaign's proportion to the base", () => {
    /* July paid 1666 in bonus over a 6840 base, a little under a quarter. */
    expect(winter.bonuses.weeklyCapYen).toHaveLength(14);
    expect(winter.bonuses.weeklyCapYen[0]).toBe(690);
    expect(winter.bonuses.weeklyCapYen[13]).toBe(720);
    expect(winter.bonuses.pages).toEqual(JULY.bonuses.pages);
    expect(winter.bonuses.minutes).toEqual(JULY.bonuses.minutes);
  });

  it("still leaves the bonuses earnable on top of the base", () => {
    const bonusTotal = winter.bonuses.weeklyCapYen.reduce((sum, cap) => sum + cap, 0);
    expect(bonusTotal).toBeGreaterThan(0);
    expect(winter.bonuses.zeroReviews.enabled).toBe(true);
  });

  it("refuses a target too small to give every week a cap", () => {
    expect(() => rulesForTarget(JULY, 14, 100)).toThrow(/cannot be spread/);
  });
});

describe("what is carried over", () => {
  it("keeps every member, opted out or not, once each", () => {
    const plan = carryOverPlan(
      [{ accountId: "emi", tracked: false }, { accountId: "hanako", tracked: true }, { accountId: "emi", tracked: false }],
      [],
    );
    expect(plan.members).toEqual([{ accountId: "emi", tracked: false }, { accountId: "hanako", tracked: true }]);
  });

  /* Two earlier campaigns each copied the same book; the third copy is one per reader. */
  it("copies each reader's book once, however many times it was copied before", () => {
    const book = { accountId: "hanako", isbn: "4091401031", title: "ドラえもん 1", thumbnailUrl: null, manualCoverUrl: null, infoUrl: null };
    const plan = carryOverPlan([], [book, { ...book }, { ...book, accountId: "kamiko" }]);
    expect(plan.books).toHaveLength(2);
  });
});
