import { describe, expect, it } from "vitest";

import {
  GAME_BATCH_SIZES,
  calculateGameScore,
  gameDateKeys,
  gamePoolItemMatches,
} from "@/lib/gameMode";

describe("Game Mode", () => {
  it("supports every agreed batch size", () => {
    expect(GAME_BATCH_SIZES).toEqual([5, 10, 15, 20, 25, 50]);
  });

  it("scores accuracy near 1,000 with a bounded speed bonus", () => {
    expect(calculateGameScore(10, 10, 16_000)).toBe(1_083);
    expect(calculateGameScore(10, 10, 50_000)).toBe(1_050);
    expect(calculateGameScore(10, 10, 100_000)).toBe(1_000);
    expect(calculateGameScore(0, 10, 1_000)).toBe(0);
    expect(calculateGameScore(1, 0.5, 1_000)).toBe(0);
  });

  it("keeps accuracy more valuable than speed", () => {
    expect(calculateGameScore(9, 10, 0)).toBeLessThan(calculateGameScore(10, 10, 100_000));
    expect(calculateGameScore(49, 50, 0)).toBeLessThan(calculateGameScore(50, 50, 500_000));
  });

  it("includes started burned items and excludes locked or unstarted items", () => {
    const burned = {
      assignmentId: 1,
      subjectId: 2,
      subjectType: "kanji" as const,
      level: 4,
      srsStage: 9,
      startedAt: "2026-01-01T00:00:00.000Z",
    };

    expect(gamePoolItemMatches(burned, 4, "kanji")).toBe(true);
    expect(gamePoolItemMatches({ ...burned, srsStage: 0 }, 4, "kanji")).toBe(false);
    expect(gamePoolItemMatches({ ...burned, startedAt: null }, 4, "kanji")).toBe(false);
  });

  it("filters exact levels and supports mixed categories", () => {
    const item = {
      assignmentId: 1,
      subjectId: 2,
      subjectType: "vocabulary" as const,
      level: 12,
      srsStage: 5,
      startedAt: "2026-01-01T00:00:00.000Z",
    };

    expect(gamePoolItemMatches(item, 12, "vocabulary")).toBe(true);
    expect(gamePoolItemMatches(item, 12, "mixed")).toBe(true);
    expect(gamePoolItemMatches(item, 11, "mixed")).toBe(false);
    expect(gamePoolItemMatches(item, 12, "kanji")).toBe(false);
  });

  it("builds today, yesterday, and seven-day date keys", () => {
    expect(gameDateKeys("today", "2026-08-24")).toEqual(["2026-08-24"]);
    expect(gameDateKeys("yesterday", "2026-08-24")).toEqual(["2026-08-23"]);
    expect(gameDateKeys("seven-days", "2026-08-24")).toEqual([
      "2026-08-24",
      "2026-08-23",
      "2026-08-22",
      "2026-08-21",
      "2026-08-20",
      "2026-08-19",
      "2026-08-18",
    ]);
  });
});
