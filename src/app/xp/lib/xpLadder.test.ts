import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { XP_LEVEL_COST, XP_RANKS, xpForLevel } from "@/lib/xp/xpCurve";
import { xpRankBadge, xpRankName } from "@/lib/xp/xpRanks";

import { XP_LADDER_MILESTONES, xpLadderNeighbours, xpLadderRows } from "./xpLadder";

describe("xpLadderRows", () => {
  it("has a row for every rank, in order", () => {
    const rows = xpLadderRows(null);
    expect(rows).toHaveLength(XP_RANKS);
    expect(rows.map((row) => row.level)).toEqual(
      Array.from({ length: XP_RANKS }, (_unused, index) => index + 1),
    );
  });

  it("charges nothing for rank 1, because that is where everybody starts", () => {
    const [first] = xpLadderRows(null);
    expect(first.cost).toBe(0);
    expect(first.total).toBe(0);
  });

  /* The off-by-one this guards is the reason the offset is written out: the
     table's first entry is the price of rank 2, not of rank 1. */
  it("prices a rank at what the curve charges to reach it", () => {
    const rows = xpLadderRows(null);
    expect(rows[1].cost).toBe(XP_LEVEL_COST[0]);
    expect(rows[9].cost).toBe(XP_LEVEL_COST[8]);
    for (const row of rows) {
      expect(row.total).toBe(xpForLevel(row.level));
      if (row.level > 1) expect(row.cost).toBe(row.total - xpForLevel(row.level - 1));
    }
  });

  it("gets dearer the whole way up, so the chart never dips", () => {
    const rows = xpLadderRows(null);
    for (let index = 2; index < rows.length; index += 1) {
      expect(rows[index].cost).toBeGreaterThan(rows[index - 1].cost);
    }
  });

  it("marks where the viewer stands, and only there", () => {
    const rows = xpLadderRows(xpForLevel(12));
    expect(rows.filter((row) => row.state === "here").map((row) => row.level)).toEqual([12]);
    expect(rows[10].state).toBe("behind");
    expect(rows[12].state).toBe("ahead");
  });

  it("marks nobody for a visitor with no account", () => {
    expect(xpLadderRows(null).some((row) => row.state !== "ahead")).toBe(false);
  });

  it("puts a brand-new member on rank 1 rather than nowhere", () => {
    const rows = xpLadderRows(0);
    expect(rows[0].state).toBe("here");
  });

  it("keeps the top rank reachable", () => {
    const rows = xpLadderRows(xpForLevel(XP_RANKS));
    expect(rows[XP_RANKS - 1].state).toBe("here");
  });

  it("names every rank from the rank file", () => {
    for (const row of xpLadderRows(null)) {
      expect(row.name).toBe(xpRankName(row.level));
      expect(row.name.length).toBeGreaterThan(0);
    }
  });

  it("draws every bar against the dearest rank, so none overflows", () => {
    const rows = xpLadderRows(null);
    for (const row of rows) {
      expect(row.share).toBeGreaterThanOrEqual(0);
      expect(row.share).toBeLessThanOrEqual(1);
    }
    /* The dearest rung a member ever pays for is the top one, and its bar is
       full. `XP_LEVEL_COST` carries one price more than the ladder has rungs
       - rank 1 is free - so scaling against the raw table would stop the last
       bar short. */
    expect(rows[XP_RANKS - 1].share).toBe(1);
    expect(rows[XP_RANKS - 1].cost).toBe(XP_LEVEL_COST[XP_RANKS - 2]);
  });

  it("names milestones that exist on the ladder", () => {
    for (const level of XP_LADDER_MILESTONES) {
      expect(level).toBeGreaterThanOrEqual(1);
      expect(level).toBeLessThanOrEqual(XP_RANKS);
    }
  });
});

describe("the rung badge", () => {
  /* John asked for `L10 Elder` on 2026-09-05. It is the one bare L on the
     site and it is allowed only beside the XP total, which names the ladder. */
  it("draws a rank as L{n}", () => {
    expect(xpRankBadge(10)).toBe("L10");
    expect(xpRankBadge(1)).toBe("L1");
  });

  it("clamps rather than drawing a rung that is not there", () => {
    expect(xpRankBadge(0)).toBe("L1");
    expect(xpRankBadge(XP_RANKS + 40)).toBe(`L${XP_RANKS}`);
  });
});

describe("where you are", () => {
  /* A hundred rows in a box that shows fourteen means the marked row is
     usually the one row a member cannot see. John's fix: stand the three that
     answer the question above the table. */
  it("names the rung passed, the one stood on and the one ahead", () => {
    const near = xpLadderNeighbours(xpLadderRows(xpForLevel(29)));
    expect(near).not.toBeNull();
    expect(near!.previous?.level).toBe(28);
    expect(near!.here.level).toBe(29);
    expect(near!.next?.level).toBe(30);
  });

  it("has nothing behind it at the bottom of the ladder", () => {
    const near = xpLadderNeighbours(xpLadderRows(0));
    expect(near!.previous).toBeNull();
    expect(near!.here.level).toBe(1);
    expect(near!.next?.level).toBe(2);
  });

  it("has nothing ahead of it at the top", () => {
    const near = xpLadderNeighbours(xpLadderRows(xpForLevel(XP_RANKS)));
    expect(near!.here.level).toBe(XP_RANKS);
    expect(near!.next).toBeNull();
  });

  it("is absent for a visitor with no rung", () => {
    expect(xpLadderNeighbours(xpLadderRows(null))).toBeNull();
  });

  it("stands above the table rather than replacing it", () => {
    const chart = readFileSync("src/app/xp/XpLadderChart.tsx", "utf8");
    expect(chart).toContain("xpLadderNeighbours");
    expect(chart).toContain("near.previous");
    expect(chart).toContain("near.next");
    /* Still a server component. The strip is what a scroll effect would have
       been for, and it costs the page no client code. */
    expect(chart).not.toContain("use client");
  });
});

describe("the board page", () => {
  const page = readFileSync("src/app/xp/page.tsx", "utf8");

  it("stands the ladder beside the standings", () => {
    expect(page).toContain("XpLadderChart");
    expect(page).toContain("lg:grid-cols-2");
  });

  it("hands the chart the viewer's own total, not the leader's", () => {
    expect(page).toContain("own?.xp ?? null");
  });
});
