import { describe, expect, it } from "vitest";

import {
  DEFAULT_RANKING_WEIGHTS,
  RANKING_WEIGHT_MAX,
  parseRankingWeights,
  rankingFormulaText,
  rankingScore,
} from "./rankingWeights";

const LABELS = { level: "Level", learned: "Learned", passed: "Guru+", burned: "Burned" };

describe("what a leaderboard score is made of", () => {
  /*
   * The formula the WaniKani board has always used, kept as the default so
   * turning the weights into settings changed nobody's placing on the day it
   * shipped. There was no test on it at all before this.
   */
  it("keeps the weights the board already ranked on", () => {
    expect(DEFAULT_RANKING_WEIGHTS).toEqual({ level: 1000, learned: 2, passed: 3, burned: 4 });
  });

  it("adds up each part times its weight", () => {
    const score = rankingScore(
      { level: 10, learned: 100, passed: 40, burned: 5 },
      DEFAULT_RANKING_WEIGHTS,
    );

    expect(score).toBe(10 * 1000 + 100 * 2 + 40 * 3 + 5 * 4);
  });

  /* The property that makes a board a board: more work never scores less. */
  it("never rewards doing less", () => {
    const less = rankingScore({ level: 5, learned: 50, passed: 20, burned: 2 }, DEFAULT_RANKING_WEIGHTS);
    const more = rankingScore({ level: 5, learned: 51, passed: 20, burned: 2 }, DEFAULT_RANKING_WEIGHTS);

    expect(more).toBeGreaterThan(less);
  });

  it("scores a member who has done nothing at nothing", () => {
    expect(rankingScore({ level: 0, learned: 0, passed: 0, burned: 0 }, DEFAULT_RANKING_WEIGHTS)).toBe(0);
  });
});

describe("reading the weights back out of settings", () => {
  it("falls back to the defaults for nothing, and for nonsense", () => {
    expect(parseRankingWeights(null)).toEqual(DEFAULT_RANKING_WEIGHTS);
    expect(parseRankingWeights("")).toEqual(DEFAULT_RANKING_WEIGHTS);
    expect(parseRankingWeights("{ not json")).toEqual(DEFAULT_RANKING_WEIGHTS);
  });

  it("takes the values it recognises and defaults the rest", () => {
    const weights = parseRankingWeights(JSON.stringify({ level: 500, burned: 9 }));

    expect(weights.level).toBe(500);
    expect(weights.burned).toBe(9);
    expect(weights.learned).toBe(DEFAULT_RANKING_WEIGHTS.learned);
  });

  /*
   * These come off an admin form and end up multiplying counts. Zero is a
   * useful tuning - it turns a term off - but a negative weight would make a
   * board where doing more work lowers your score, which is not a tuning.
   */
  it("refuses a negative weight rather than inverting the board", () => {
    expect(parseRankingWeights(JSON.stringify({ learned: -5 })).learned).toBe(0);
  });

  it("caps a weight that would swamp every other term", () => {
    expect(parseRankingWeights(JSON.stringify({ level: 1e12 })).level).toBe(RANKING_WEIGHT_MAX);
  });

  it("ignores a value that is not a number at all", () => {
    expect(parseRankingWeights(JSON.stringify({ level: "lots" })).level).toBe(
      DEFAULT_RANKING_WEIGHTS.level,
    );
    expect(parseRankingWeights(JSON.stringify({ passed: null })).passed).toBe(
      DEFAULT_RANKING_WEIGHTS.passed,
    );
  });
});

describe("the formula in words", () => {
  /*
   * The home page printed this as a hand-typed sentence and the seed script
   * used a different formula entirely. Deriving the words from the same object
   * the arithmetic uses is what stops either drifting again.
   */
  it("says exactly what the arithmetic does", () => {
    expect(rankingFormulaText(DEFAULT_RANKING_WEIGHTS, LABELS)).toBe(
      "Level × 1,000 + Learned × 2 + Guru+ × 3 + Burned × 4",
    );
  });

  it("leaves out a term that is switched off", () => {
    const text = rankingFormulaText({ ...DEFAULT_RANKING_WEIGHTS, burned: 0 }, LABELS);

    expect(text).not.toContain("Burned");
    expect(text).toContain("Level");
  });
});
