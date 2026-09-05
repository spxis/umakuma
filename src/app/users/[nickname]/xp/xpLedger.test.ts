import { describe, expect, it } from "vitest";

import { summariseXpActivity } from "@/lib/xp/xpActivity";

import { buildXpLedger, formatXpDay, labelXpKinds, type XpLedgerRow } from "./xpLedger";

function row(overrides: Partial<XpLedgerRow> & { dayKey: string; kind: string; amount: number }): XpLedgerRow {
  return {
    note: null,
    label: overrides.kind,
    typeNote: "",
    ...overrides,
  };
}

describe("buildXpLedger", () => {
  it("groups a day's kinds under one day, newest day first", () => {
    const days = buildXpLedger([
      row({ dayKey: "2026-09-01", kind: "dailySignIn", amount: 10 }),
      row({ dayKey: "2026-09-03", kind: "reviewAnswered", amount: 50 }),
      row({ dayKey: "2026-09-01", kind: "reviewAnswered", amount: 40 }),
    ]);

    expect(days.map((day) => day.dayKey)).toEqual(["2026-09-03", "2026-09-01"]);
    expect(days[1].entries).toHaveLength(2);
    expect(days[1].total).toBe(50);
  });

  it("puts the largest kind first inside a day", () => {
    const [day] = buildXpLedger([
      row({ dayKey: "2026-09-01", kind: "dailySignIn", amount: 10, label: "Signed in" }),
      row({ dayKey: "2026-09-01", kind: "reviewAnswered", amount: 40, label: "Reviews" }),
      row({ dayKey: "2026-09-01", kind: "gameFinished", amount: 5, label: "Games" }),
    ]);

    expect(day.entries.map((entry) => entry.label)).toEqual(["Reviews", "Signed in", "Games"]);
  });

  /*
   * The running total only means anything counted forwards, and the ledger
   * reads backwards. Getting that the wrong way round would show a member's
   * newest day as their smallest total.
   */
  it("runs the total forwards even though the ledger reads backwards", () => {
    const days = buildXpLedger([
      row({ dayKey: "2026-09-01", kind: "a", amount: 10 }),
      row({ dayKey: "2026-09-02", kind: "a", amount: 20 }),
      row({ dayKey: "2026-09-03", kind: "a", amount: 30 }),
    ]);

    expect(days.map((day) => day.runningTotal)).toEqual([60, 30, 10]);
  });

  /*
   * The trap the schema comment warns about. A row is a whole Vancouver day's
   * earning of one kind, so nothing in the ledger may carry a timestamp - a
   * clock time beside an amount would be the day's *first* award pretending to
   * be all of it.
   */
  it("carries no time on a row, because a row is a day", () => {
    const [day] = buildXpLedger([row({ dayKey: "2026-09-01", kind: "a", amount: 10 })]);

    for (const key of Object.keys(day.entries[0])) {
      expect(key).not.toMatch(/at$|time|hour|minute/i);
    }
  });

  it("keeps the kind's sentence and the day's own note apart", () => {
    const [day] = buildXpLedger([
      row({
        dayKey: "2026-09-01",
        kind: "streakMilestone",
        amount: 150,
        label: "Streak milestone",
        typeNote: "For keeping a streak going.",
        note: "a 30-day streak",
      }),
    ]);

    expect(day.entries[0].typeNote).toBe("For keeping a streak going.");
    expect(day.entries[0].note).toBe("a 30-day streak");
  });

  it("answers with nothing for a member who has earned nothing", () => {
    expect(buildXpLedger([])).toEqual([]);
  });
});

describe("formatXpDay", () => {
  /*
   * A day key is already the Vancouver day. Formatted in the reader's own zone
   * it would slide back one, so the whole ledger would be dated a day early.
   */
  it("prints the day key it was given, not the day around it", () => {
    expect(formatXpDay("2026-09-04")).toContain("Sep");
    expect(formatXpDay("2026-09-04")).toContain("4");
    expect(formatXpDay("2026-09-04")).toContain("2026");
  });

  it("hands back anything it cannot parse rather than printing Invalid Date", () => {
    expect(formatXpDay("not-a-day")).toBe("not-a-day");
  });
});

describe("labelXpKinds", () => {
  it("gives the summary's kinds the labels a member reads", () => {
    const activity = summariseXpActivity(
      [
        { dayKey: "2026-09-01", kind: "reviewAnswered", amount: 75 },
        { dayKey: "2026-09-01", kind: "dailySignIn", amount: 25 },
      ],
      "2026-09-01",
    );

    const shares = labelXpKinds(
      activity.byKind,
      new Map([["reviewAnswered", "Reviews"], ["dailySignIn", "Signed in"]]),
    );

    expect(shares.map((entry) => entry.label)).toEqual(["Reviews", "Signed in"]);
    expect(shares[0].share).toBeCloseTo(0.75);
  });

  it("falls back to the kind's id when its type row has gone", () => {
    const activity = summariseXpActivity([{ dayKey: "2026-09-01", kind: "retired", amount: 5 }], "2026-09-01");

    expect(labelXpKinds(activity.byKind, new Map())[0].label).toBe("retired");
  });
});
