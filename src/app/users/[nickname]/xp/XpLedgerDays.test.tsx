import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import XpLedgerDays from "./XpLedgerDays";
import { buildXpLedger, type XpLedgerRow } from "./xpLedger";

const ROWS: XpLedgerRow[] = [
  {
    dayKey: "2026-09-03",
    kind: "reviewAnswered",
    amount: 50,
    note: null,
    label: "Reviews answered",
    typeNote: "Every answer counts, right or wrong.",
  },
  {
    dayKey: "2026-09-03",
    kind: "thirtyDayStreak",
    amount: 150,
    note: "a 30-day streak",
    label: "Streak milestone",
    typeNote: "For keeping a streak going.",
  },
  {
    dayKey: "2026-09-01",
    kind: "dailySignIn",
    amount: 10,
    note: null,
    label: "Signed in",
    typeNote: "For showing up at all.",
  },
];

function draw(): Document {
  const markup = renderToStaticMarkup(<XpLedgerDays days={buildXpLedger(ROWS)} />);
  return new JSDOM(`<!doctype html><body>${markup}</body>`).window.document;
}

describe("the XP ledger", () => {
  it("groups the day's kinds under the day, newest first", () => {
    const days = draw().querySelectorAll("body > ol > li");

    expect(days).toHaveLength(2);
    expect(days[0].textContent).toContain("Sep 3, 2026");
    expect(days[0].querySelectorAll("ul > li")).toHaveLength(2);
    expect(days[1].textContent).toContain("Sep 1, 2026");
  });

  it("shows what the day was worth and what it had reached", () => {
    const first = draw().querySelector("body > ol > li");

    expect(first?.textContent).toContain("+200 XP");
    expect(first?.textContent).toContain("210 XP total");
  });

  /*
   * The point of the screen: nobody should have to ask what a number was for.
   * The kind's own sentence and this day's own note are both printed, because
   * the first says what the kind is and the second says which one it was.
   */
  it("answers 'for what' beside every amount", () => {
    const text = draw().body.textContent ?? "";

    expect(text).toContain("Every answer counts, right or wrong.");
    expect(text).toContain("For keeping a streak going.");
    expect(text).toContain("a 30-day streak");
  });

  /*
   * A row is a whole day's earning of one kind, so the ledger never prints a
   * clock time beside an amount - it would be the day's first award pretending
   * to be all of it.
   */
  it("prints no time of day anywhere", () => {
    expect(draw().body.textContent ?? "").not.toMatch(/\d{1,2}:\d{2}/);
  });

  it("nests no interactive element inside another", () => {
    for (const control of draw().querySelectorAll("a, button, [role='button']")) {
      expect(control.querySelector("a, button, [role='button']")).toBeNull();
    }
  });
});
