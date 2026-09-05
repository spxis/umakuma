import { describe, expect, it } from "vitest";

import { summariseXpActivity, type XpDay } from "./xpActivity";

const day = (dayKey: string, kind = "reviewAnswered", amount = 10): XpDay => ({ dayKey, kind, amount });

describe("summariseXpActivity", () => {
  it("says nothing happened rather than dividing by zero", () => {
    const summary = summariseXpActivity([], "2026-09-04");
    expect(summary).toMatchObject({
      daysActive: 0,
      totalXp: 0,
      averagePerActiveDay: 0,
      bestDay: null,
      daysSinceLastActive: null,
    });
  });

  it("counts a day once however many kinds landed on it", () => {
    const summary = summariseXpActivity(
      [day("2026-09-04", "reviewAnswered", 10), day("2026-09-04", "gameFinished", 5)],
      "2026-09-04",
    );
    expect(summary.daysActive).toBe(1);
    expect(summary.totalXp).toBe(15);
    expect(summary.bestDay).toEqual({ dayKey: "2026-09-04", amount: 15 });
  });

  it("ranks the kinds by what they were worth, largest first", () => {
    const summary = summariseXpActivity(
      [day("2026-09-01", "reviewAnswered", 10), day("2026-09-01", "gameFinished", 40)],
      "2026-09-01",
    );
    expect(summary.byKind.map((entry) => entry.kind)).toEqual(["gameFinished", "reviewAnswered"]);
    expect(summary.byKind[0].share).toBeCloseTo(0.8);
  });

  /* The number this screen exists for on a family site. */
  it("counts the days since somebody was last here", () => {
    const summary = summariseXpActivity([day("2026-08-21")], "2026-09-04");
    expect(summary.daysSinceLastActive).toBe(14);
  });

  /*
   * Rest days and vacation days hold the chain and are not study. Both halves
   * of that matter: without them the admin screen would show a shorter streak
   * than the member is being shown for the same account, and counting them as
   * activity would report study on a day nobody opened the site.
   */
  it("lets a protected day hold the streak without becoming activity", () => {
    const rows = [day("2026-09-01"), day("2026-09-02"), day("2026-09-04")];
    const unprotected = summariseXpActivity(rows, "2026-09-04");
    expect(unprotected.streak.current).toBe(1);

    const protectedRun = summariseXpActivity(rows, "2026-09-04", ["2026-09-03"]);
    expect(protectedRun.streak.current).toBe(4);
    // The gap was covered, not studied.
    expect(protectedRun.daysActive).toBe(3);
    expect(protectedRun.totalXp).toBe(unprotected.totalXp);
  });

  it("reports last active as the last day they actually studied, not a covered one", () => {
    const summary = summariseXpActivity([day("2026-09-01")], "2026-09-04", ["2026-09-02", "2026-09-03", "2026-09-04"]);
    expect(summary.streak.lastActiveDay).toBe("2026-09-01");
    expect(summary.streak.activeToday).toBe(false);
    expect(summary.daysSinceLastActive).toBe(3);
  });
});
