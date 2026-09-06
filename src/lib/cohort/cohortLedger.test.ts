import { describe, expect, it } from "vitest";

import { XP_AWARDS, XP_BONUSES, XP_DAILY_CAPS } from "@/lib/xp/xpAwards";
import { xpLevelFor } from "@/lib/xp/xpCurve";

import { CohortLedger } from "./cohortLedger";

/* Noon in Vancouver on the day named, so a day key is never on a boundary. */
function noon(day: string): Date {
  return new Date(`${day}T19:00:00Z`);
}

describe("CohortLedger.award", () => {
  it("accumulates a kind onto one row per day and keeps the total in step", () => {
    const ledger = new CohortLedger();
    expect(ledger.award("reviewAnswered", noon("2026-09-01"))).toBe(XP_AWARDS.reviewAnswered);
    expect(ledger.award("reviewAnswered", noon("2026-09-01"))).toBe(XP_AWARDS.reviewAnswered);
    const rows = ledger.rowsForDay("2026-09-01");
    expect(rows).toHaveLength(1);
    expect(rows[0]!.amount).toBe(2 * XP_AWARDS.reviewAnswered);
    expect(ledger.xp).toBe(2 * XP_AWARDS.reviewAnswered);
    expect(ledger.xpLevel).toBe(xpLevelFor(ledger.xp));
  });

  it("pays a once-a-day kind once", () => {
    const ledger = new CohortLedger();
    expect(ledger.award("dailySignIn", noon("2026-09-01"))).toBe(XP_AWARDS.dailySignIn);
    expect(ledger.award("dailySignIn", noon("2026-09-01"))).toBe(0);
    expect(ledger.award("dailySignIn", noon("2026-09-02"))).toBe(XP_AWARDS.dailySignIn);
  });

  it("stops a capped kind at its cap, the way the site does", () => {
    const ledger = new CohortLedger();
    const cap = XP_DAILY_CAPS.lessonLearned!;
    const paid = ledger.awardAll([{ kind: "lessonLearned", times: 100 }], noon("2026-09-01"));
    expect(paid).toBe(cap);
    expect(ledger.rowsForDay("2026-09-01")[0]!.amount).toBe(cap);
  });

  it("lets a rank widen the games cap", () => {
    const beginner = new CohortLedger();
    expect(beginner.awardAll([{ kind: "gameFinished" }, { kind: "gameFinished" }, { kind: "gameFinished" }], noon("2026-09-01")))
      .toBe(2 * XP_AWARDS.gameFinished);

    /* Rank 10 plays three a day. */
    const ranked = new CohortLedger([], 1);
    while (ranked.xpLevel < 10) ranked.award("reviewAnswered", noon("2026-08-01"));
    expect(ranked.awardAll([{ kind: "gameFinished" }, { kind: "gameFinished" }, { kind: "gameFinished" }], noon("2026-09-01")))
      .toBe(3 * XP_AWARDS.gameFinished);
  });

  it("loads existing rows and keeps only the days it touches for writing back", () => {
    const old = { kind: "reviewAnswered", dayKey: "2026-08-30", amount: 12, note: null, createdAt: noon("2026-08-30"), updatedAt: noon("2026-08-30") };
    const ledger = new CohortLedger([old], 12);
    ledger.award("reviewAnswered", noon("2026-09-01"));
    expect(ledger.touchedRows().map((row) => row.dayKey)).toEqual(["2026-09-01"]);
    expect(ledger.dayKeys().sort()).toEqual(["2026-08-30", "2026-09-01"]);
  });
});

describe("CohortLedger.settleDay", () => {
  it("signs the member in once a day, clears the queue quest each day, and pays the seventh day's streak", () => {
    const ledger = new CohortLedger();
    let total = 0;
    for (let day = 1; day <= 7; day += 1) {
      const at = noon(`2026-09-0${day}`);
      ledger.award("reviewAnswered", at);
      total += ledger.settleDay(at, 0);
      /* A second settlement on the same day pays nothing more. */
      expect(ledger.settleDay(at, 0)).toBe(0);
    }
    /* Every day answered something with nothing left due, which is the queue quest. */
    expect(total).toBe(
      7 * XP_AWARDS.dailySignIn + 7 * XP_BONUSES.queueCleared + XP_BONUSES.sevenDayStreak + XP_AWARDS.weeklyStreak,
    );
  });

  it("pays the well-rounded quest on a day with a lesson and a game, and only once", () => {
    const ledger = new CohortLedger();
    const at = noon("2026-09-03");
    ledger.award("lessonLearned", at);
    expect(ledger.settleDay(at, 5)).toBe(XP_AWARDS.dailySignIn);
    ledger.award("gameFinished", at);
    expect(ledger.settleDay(at, 5)).toBe(XP_BONUSES.wellRoundedDay);
    expect(ledger.settleDay(at, 5)).toBe(0);
  });

  it("pays for an emptied queue only after answering something", () => {
    const ledger = new CohortLedger();
    const at = noon("2026-09-03");
    expect(ledger.settleDay(at, 0)).toBe(XP_AWARDS.dailySignIn);
    ledger.award("reviewAnswered", at);
    expect(ledger.settleDay(at, 0)).toBe(XP_BONUSES.queueCleared);
  });
});
