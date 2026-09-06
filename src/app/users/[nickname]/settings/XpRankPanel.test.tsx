import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { XP_RANKS, xpForLevel, xpStanding } from "@/lib/xp/xpCurve";
import { xpRankName } from "@/lib/xp/xpRanks";

import XpRankPanel from "./XpRankPanel";

function draw(xp: number): Document {
  return new JSDOM(`<!doctype html><body>${renderToStaticMarkup(<XpRankPanel xp={xp} />)}</body>`).window.document;
}

/**
 * The member-facing half of the XP ladder.
 *
 * Two things have to hold whatever the data does. The rank names arrive in a
 * separate file on a separate schedule, so the panel has to draw before they
 * land; and the top rank has no next rank, no span and nothing to go, which is
 * where a progress bar written for the middle of a ladder divides by zero.
 */
describe("the XP rank panel", () => {
  it("names the rank and says where it sits on the ladder", () => {
    const page = draw(xpForLevel(7) + 10);
    const text = page.body.textContent ?? "";
    expect(text).toContain(xpRankName(7));
    expect(text).toContain(`Rank 7 of ${XP_RANKS}`);
  });

  it("draws the bar at the fraction xpStanding reports", () => {
    const xp = xpForLevel(5) + Math.floor((xpForLevel(6) - xpForLevel(5)) / 2);
    const page = draw(xp);
    const bar = page.querySelector('[role="progressbar"]');
    expect(bar?.getAttribute("aria-valuenow")).toBe(String(Math.round(xpStanding(xp).ratio * 100)));
    expect(bar?.getAttribute("aria-label")).toBeTruthy();
  });

  it("names the next rank and what it costs", () => {
    const page = draw(0);
    const text = page.body.textContent ?? "";
    expect(text).toContain(xpRankName(2));
    expect(text).toContain(`${xpStanding(0).toNext.toLocaleString()} XP to go`);
  });

  it("stops offering a next rank at the top of the ladder", () => {
    const page = draw(xpForLevel(XP_RANKS) + 5_000);
    const text = page.body.textContent ?? "";
    expect(text).toContain(xpRankName(XP_RANKS));
    expect(text).not.toContain("XP to go");
    expect(page.querySelector('[role="progressbar"]')?.getAttribute("aria-valuenow")).toBe("100");
  });

  it("has no control inside another control, and nothing at /50", () => {
    /* Two of the repo's standing rules, both of which are easier to break in a
       card that grows a button later than to notice afterwards. */
    const page = draw(xpForLevel(30));
    for (const control of page.querySelectorAll("button, a, input, select")) {
      expect(control.querySelector("button, a, input, select")).toBeNull();
    }
    expect(page.body.innerHTML).not.toContain("/50");
  });

  it("draws a rank whose name has not been written yet", () => {
    /* The names land independently of this code. Until they do, a rank reads
       as its number rather than as a blank or a crash. */
    const page = draw(xpForLevel(XP_RANKS - 1));
    expect((page.body.textContent ?? "").length).toBeGreaterThan(0);
    expect(page.querySelector('[role="progressbar"]')).not.toBeNull();
  });
});
