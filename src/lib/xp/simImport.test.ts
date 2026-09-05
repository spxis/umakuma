import { describe, expect, it } from "vitest";

import {
  IMPORT_ENTITLEMENT_FLOOR_RANK,
  IMPORT_FLAT_XP,
  importReferenceCurve,
  importVerdict,
  importVerdicts,
} from "./simImport";
import { xpLevelFor } from "./xpCurve";
import { gamesPerDayAt, XP_GAMES_PER_DAY_BASE } from "./xpEntitlements";
import { restDaysAllowedAt } from "./xpRest";

describe("the import question", () => {
  it("knows what a member who earned the level here had banked getting there", () => {
    const curve = importReferenceCurve();
    expect(curve.levelXp[20]).toBeGreaterThan(20_000);
    expect(curve.levelDays[20]).toBeGreaterThan(180);
    expect(curve.levelXp[40]!).toBeGreaterThan(curve.levelXp[20]!);
  });

  it("shows why the award cannot be scaled by the level imported", () => {
    const at20 = importVerdict(20);
    /* Paying what the knowledge cost here would seat a day-one importer above
       a member who has turned up every day for the better part of a year. */
    expect(at20.earnedRank!).toBeGreaterThan(50);
    expect(at20.earnedXp!).toBeGreaterThan(at20.flatXp * 100);
  });

  it("pays a flat amount for the act, and it is small", () => {
    expect(IMPORT_FLAT_XP).toBe(250);
    expect(IMPORT_FLAT_XP % 5).toBe(0);
    expect(xpLevelFor(IMPORT_FLAT_XP)).toBeLessThan(10);
    for (const verdict of importVerdicts()) expect(verdict.flatXp).toBe(IMPORT_FLAT_XP);
  });

  it("floors entitlements at a fortnight of attendance, not at ten months of it", () => {
    expect(IMPORT_ENTITLEMENT_FLOOR_RANK).toBe(10);
    const verdict = importVerdict(20);
    expect(verdict.entitlementFloorRank).toBe(IMPORT_ENTITLEMENT_FLOOR_RANK);
    /* It has to buy something, or it is not a floor: more than the beginner's
       two games a day, and more than the beginner's seven rest days. */
    expect(verdict.gamesPerDay).toBeGreaterThan(XP_GAMES_PER_DAY_BASE);
    expect(verdict.gamesPerDay).toBe(gamesPerDayAt(IMPORT_ENTITLEMENT_FLOOR_RANK));
    expect(verdict.restDays).toBeGreaterThan(restDaysAllowedAt(1));
    expect(verdict.vacationWeeks).toBeGreaterThan(0);
    /* And nowhere near what the same level would be worth if it were bought. */
    expect(verdict.entitlementFloorRank).toBeLessThan(verdict.earnedRank!);
  });

  it("clamps a level outside the ladder rather than reading off the end", () => {
    expect(importVerdict(0).level).toBe(1);
    expect(importVerdict(500).level).toBe(100);
  });
});
