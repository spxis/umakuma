import { describe, expect, it } from "vitest";

import {
  GAME_BATCH_SIZES,
  calculateGameScore,
  formatGameDuration,
  gameDateKeys,
  gamePoolItemMatches,
} from "@/lib/gameMode";

describe("Game Mode", () => {
  it("supports every agreed batch size", () => {
    expect(GAME_BATCH_SIZES).toEqual([5, 10, 15, 20, 25, 50]);
  });

  it("scores accuracy near 1,000 with a bounded speed bonus", () => {
    expect(calculateGameScore(10, 10, 8_100)).toBe(1_099);
    expect(calculateGameScore(10, 10, 10_000)).toBe(1_080);
    expect(calculateGameScore(10, 10, 12_000)).toBe(1_060);
    expect(calculateGameScore(10, 10, 18_000)).toBe(1_000);
    expect(calculateGameScore(0, 10, 1_000)).toBe(0);
    expect(calculateGameScore(1, 0.5, 1_000)).toBe(0);
  });

  it("distinguishes ten perfect runs inside a two-second window", () => {
    const durations = [10_000, 10_200, 10_400, 10_600, 10_800, 11_100, 11_300, 11_500, 11_700, 12_000];
    const scores = durations.map((durationMs) => calculateGameScore(10, 10, durationMs));

    expect(new Set(scores).size).toBe(10);
    expect(scores).toEqual([1_080, 1_078, 1_076, 1_074, 1_072, 1_069, 1_067, 1_065, 1_063, 1_060]);
  });

  it("gives every tenth a unique perfect score", () => {
    const scores = Array.from({ length: 21 }, (_, index) => calculateGameScore(10, 10, 10_000 + index * 100));
    expect(new Set(scores).size).toBe(21);
    expect(scores[0]).toBe(1_080);
    expect(scores[20]).toBe(1_060);
  });

  it("distinguishes 8.1 seconds from 8.2 seconds", () => {
    expect(calculateGameScore(10, 10, 8_100)).toBe(1_099);
    expect(calculateGameScore(10, 10, 8_200)).toBe(1_098);
  });

  it("keeps accuracy more valuable than speed", () => {
    expect(calculateGameScore(9, 10, 0)).toBeLessThan(calculateGameScore(10, 10, 20_000));
    expect(calculateGameScore(49, 50, 0)).toBeLessThan(calculateGameScore(50, 50, 100_000));
  });

  it("formats game duration to tenths of a second", () => {
    expect(formatGameDuration(13_987)).toBe("0:13.9");
    expect(formatGameDuration(61_040)).toBe("1:01.0");
    expect(formatGameDuration(null)).toBe("-");
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
