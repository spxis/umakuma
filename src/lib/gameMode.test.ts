import { describe, expect, it } from "vitest";

import {
  GAME_BATCH_SIZES,
  calculateGameScore,
  formatGameDuration,
  formatGameScore,
  gameDateKeys,
  gameLeaderboardMemberIsEligible,
  gameOptionIndexForKey,
  gamePoolItemMatches,
} from "@/lib/gameMode";

describe("Game Mode", () => {
  it("supports every agreed batch size", () => {
    expect(GAME_BATCH_SIZES).toEqual([5, 10, 15, 20, 25, 50]);
  });

  it("maps arrows and number keys to regular and hard-mode choices", () => {
    expect(gameOptionIndexForKey("ArrowLeft", 3)).toBe(0);
    expect(gameOptionIndexForKey("ArrowUp", 3)).toBe(1);
    expect(gameOptionIndexForKey("ArrowDown", 3)).toBe(1);
    expect(gameOptionIndexForKey("ArrowRight", 3)).toBe(2);
    expect(gameOptionIndexForKey("1", 3)).toBe(0);
    expect(gameOptionIndexForKey("2", 3)).toBe(1);
    expect(gameOptionIndexForKey("3", 3)).toBe(2);
    expect(gameOptionIndexForKey("4", 3)).toBe(0);
    expect(gameOptionIndexForKey("5", 3)).toBe(1);
    expect(gameOptionIndexForKey("6", 3)).toBe(2);
    expect(gameOptionIndexForKey("2", 2)).toBeNull();
    expect(gameOptionIndexForKey("ArrowUp", 2)).toBeNull();
    expect(gameOptionIndexForKey("ArrowDown", 2)).toBeNull();
    expect(gameOptionIndexForKey("5", 2)).toBeNull();
    expect(gameOptionIndexForKey("3", 2)).toBe(1);
    expect(gameOptionIndexForKey("6", 2)).toBe(1);
  });

  it("rewards every tenth and higher levels", () => {
    expect(formatGameScore(calculateGameScore(10, 10, 10_000, 7))).toBe("1,063.4");
    expect(formatGameScore(calculateGameScore(10, 10, 20_000, 7))).toBe("1,053.4");
    expect(formatGameScore(calculateGameScore(10, 10, 30_000, 7))).toBe("1,043.4");
    expect(formatGameScore(calculateGameScore(10, 10, 30_000, 17))).toBe("1,048.4");
    expect(formatGameScore(calculateGameScore(10, 10, 30_000, 1))).toBe("1,040.4");
    expect(formatGameScore(calculateGameScore(10, 10, 30_000, 60))).toBe("1,069.9");
  });

  it("gives adjacent tenths distinct scores while speed bonus remains", () => {
    expect(calculateGameScore(10, 10, 8_100, 7) - calculateGameScore(10, 10, 8_200, 7)).toBe(1);
    expect(calculateGameScore(10, 10, 30_000, 7) - calculateGameScore(10, 10, 30_100, 7)).toBe(1);
  });

  it("keeps accuracy more valuable than speed", () => {
    expect(calculateGameScore(9, 10, 0, 60)).toBeLessThan(calculateGameScore(10, 10, 100_000, 1));
    expect(calculateGameScore(49, 50, 0, 60)).toBeLessThan(calculateGameScore(50, 50, 100_000, 1));
    expect(calculateGameScore(0, 10, 1_000, 60)).toBe(0);
    expect(calculateGameScore(1, 0.5, 1_000, 60)).toBe(0);
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

  it("excludes members below a level-specific leaderboard", () => {
    expect(gameLeaderboardMemberIsEligible(17, 18)).toBe(false);
    expect(gameLeaderboardMemberIsEligible(18, 18)).toBe(true);
    expect(gameLeaderboardMemberIsEligible(19, 18)).toBe(true);
    expect(gameLeaderboardMemberIsEligible(1, "any")).toBe(true);
    expect(gameLeaderboardMemberIsEligible(1, "all")).toBe(true);
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
