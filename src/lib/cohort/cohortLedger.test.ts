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

/*
 * The receipts beside the tally.
 *
 * The server writes one XpAward per award, including the ones a daily cap
 * paid nothing for; until this the mirror kept only the tally, so a
 * simulated member's capped lesson day was blank where a real member's says
 * which ten lessons went unpaid. Two shapes of member, one history row apart.
 */
describe("the ledger's receipts", () => {
  it("records every award with its item, and a capped batch at zero", () => {
    const ledger = new CohortLedger();
    const at = new Date("2026-09-12T12:00:00Z");
    /* Thirty-one lessons: the cap pays thirty, and the thirty-first is
       recorded rather than lost - as are any after it, without asking again. */
    const ids = Array.from({ length: 33 }, (_, index) => 1000 + index);
    ledger.awardAll([{ kind: "lessonLearned", times: ids.length, subjectIds: ids }], at);
    const lessons = ledger.awards.filter((award) => award.kind === "lessonLearned");
    expect(lessons).toHaveLength(33);
    expect(lessons.filter((award) => award.amount > 0)).toHaveLength(30);
    expect(lessons.filter((award) => award.amount === 0).map((award) => award.subjectId)).toEqual([1030, 1031, 1032]);
    expect(lessons[0]).toMatchObject({ subjectId: 1000, dayKey: "2026-09-12" });
  });

  it("writes no receipt for a once-a-day re-check, like the server", () => {
    const ledger = new CohortLedger();
    const at = new Date("2026-09-12T12:00:00Z");
    ledger.award("dailySignIn", at);
    ledger.award("dailySignIn", at);
    expect(ledger.awards.filter((award) => award.kind === "dailySignIn")).toHaveLength(1);
  });
});

