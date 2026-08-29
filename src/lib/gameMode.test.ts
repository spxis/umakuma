import { describe, expect, it } from "vitest";

import {
  GAME_BATCH_SIZES,
  GAME_KINDS,
  GAME_ULTRA_BATCH_SIZE,
  calculateGameScore,
  calculateTimeAttackScore,
  formatGameDuration,
  formatGameScore,
  gameAnswerProgress,
  gameDateKeys,
  gameEndlessCycleLimitReached,
  gameLeaderboardMemberIsEligible,
  gameOptionIndexForKey,
  gameProgressFlags,
  gameRunIsExpired,
  isUltraGameBatchSize,
  gamePoolItemMatches,
  resolveGameScore,
} from "@/lib/gameMode";

describe("Game Mode", () => {
  it("supports every agreed batch size", () => {
    expect(GAME_BATCH_SIZES).toEqual([5, 10, 15, 20, 25, 50]);
    expect(isUltraGameBatchSize(GAME_ULTRA_BATCH_SIZE)).toBe(true);
    expect(isUltraGameBatchSize(50)).toBe(false);
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

  it("keeps Ultra running through perfect cycles and stops on a miss", () => {
    const ultra = { endless: true, endsOnWrong: true };
    expect(gameAnswerProgress({ ...ultra, correct: true, answeredCount: 4, questionCount: 5, appendedQuestionCount: 5 })).toEqual({
      complete: false,
      appendCycle: false,
      questionCount: 5,
    });
    expect(gameAnswerProgress({ ...ultra, correct: true, answeredCount: 5, questionCount: 5, appendedQuestionCount: 5 })).toEqual({
      complete: false,
      appendCycle: true,
      questionCount: 10,
    });
    expect(gameAnswerProgress({ ...ultra, correct: false, answeredCount: 7, questionCount: 10, appendedQuestionCount: 0 })).toEqual({
      complete: true,
      appendCycle: false,
      questionCount: 7,
    });
    expect(gameAnswerProgress({ endless: false, endsOnWrong: false, correct: true, answeredCount: 5, questionCount: 5, appendedQuestionCount: 0 })).toEqual({
      complete: true,
      appendCycle: false,
      questionCount: 5,
    });
  });

  it("maps each kind to its progress rules", () => {
    expect(gameProgressFlags(GAME_KINDS.match, false)).toEqual({ endless: false, endsOnWrong: false });
    expect(gameProgressFlags(GAME_KINDS.match, true)).toEqual({ endless: true, endsOnWrong: true });
    expect(gameProgressFlags(GAME_KINDS.daily, false)).toEqual({ endless: false, endsOnWrong: false });
    expect(gameProgressFlags(GAME_KINDS.revenge, false)).toEqual({ endless: false, endsOnWrong: false });
    expect(gameProgressFlags(GAME_KINDS.timeAttack, false)).toEqual({ endless: true, endsOnWrong: false });
    expect(gameProgressFlags(GAME_KINDS.shiritori, false)).toEqual({ endless: true, endsOnWrong: true });
  });

  it("keeps Time Attack running through a wrong answer and stops at the clock", () => {
    const timeAttack = { endless: true, endsOnWrong: false };
    expect(gameAnswerProgress({ ...timeAttack, correct: false, answeredCount: 4, questionCount: 10, appendedQuestionCount: 0 })).toEqual({
      complete: false,
      appendCycle: false,
      questionCount: 10,
    });
    expect(gameAnswerProgress({ ...timeAttack, expired: true, correct: true, answeredCount: 9, questionCount: 10, appendedQuestionCount: 0 })).toEqual({
      complete: true,
      appendCycle: false,
      questionCount: 9,
    });
  });

  it("stops Ultra after three full rounds so a tiny pool cannot run forever", () => {
    // Seven radicals: the run ends at 21 answers even with no wrong answer.
    expect(gameEndlessCycleLimitReached(7, 7)).toBe(false);
    expect(gameEndlessCycleLimitReached(14, 7)).toBe(false);
    expect(gameEndlessCycleLimitReached(20, 7)).toBe(false);
    expect(gameEndlessCycleLimitReached(21, 7)).toBe(true);
    // A large pool is effectively unbounded in a single sitting.
    expect(gameEndlessCycleLimitReached(1_000, 1_823)).toBe(false);
    // An empty pool has nothing left to serve.
    expect(gameEndlessCycleLimitReached(0, 0)).toBe(true);
  });

  it("ends an endless run when nothing can be appended", () => {
    expect(gameAnswerProgress({ endless: true, endsOnWrong: true, correct: true, answeredCount: 6, questionCount: 6, appendedQuestionCount: 0 })).toEqual({
      complete: true,
      appendCycle: false,
      questionCount: 6,
    });
  });

  it("expires only timed runs past the grace window", () => {
    expect(gameRunIsExpired(GAME_KINDS.timeAttack, 60_000, 59_000)).toBe(false);
    expect(gameRunIsExpired(GAME_KINDS.timeAttack, 60_000, 61_000)).toBe(false);
    expect(gameRunIsExpired(GAME_KINDS.timeAttack, 60_000, 62_000)).toBe(true);
    expect(gameRunIsExpired(GAME_KINDS.match, 60_000, 900_000)).toBe(false);
    expect(gameRunIsExpired(GAME_KINDS.timeAttack, null, 900_000)).toBe(false);
  });

  it("pays Time Attack for volume and keeps the level bonus under one answer", () => {
    expect(calculateTimeAttackScore(10, 10, 1)).toBe(5_008);
    expect(calculateTimeAttackScore(10, 12, 1)).toBeLessThan(calculateTimeAttackScore(10, 10, 1));
    expect(calculateTimeAttackScore(11, 11, 1)).toBeGreaterThan(calculateTimeAttackScore(10, 10, 60));
    expect(calculateTimeAttackScore(0, 8, 60)).toBe(0);
    expect(calculateTimeAttackScore(3, 0, 60)).toBe(0);
  });

  it("routes each kind to its own scoring formula", () => {
    const base = { correctCount: 10, questionCount: 10, durationMs: 30_000, level: 7 };
    expect(resolveGameScore({ ...base, kind: GAME_KINDS.match })).toBe(calculateGameScore(10, 10, 30_000, 7));
    expect(resolveGameScore({ ...base, kind: GAME_KINDS.daily })).toBe(calculateGameScore(10, 10, 30_000, 7));
    expect(resolveGameScore({ ...base, kind: GAME_KINDS.timeAttack })).toBe(calculateTimeAttackScore(10, 10, 7));
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
