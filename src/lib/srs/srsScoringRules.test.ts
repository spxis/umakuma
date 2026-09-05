import { describe, expect, it } from "vitest";

import {
  DEFAULT_SRS_SCORING_RULES,
  isLeech,
  parseSrsScoringRules,
} from "./srsScoringRules";

describe("scoring rules that can change without a deploy", () => {
  it("has every rule off by default", () => {
    /* A scheduler that changes behaviour the moment it deploys is one nobody
       can reason about. Each mechanism ships dark and is switched on
       deliberately. */
    expect(DEFAULT_SRS_SCORING_RULES.throttleLessonsOnBacklog).toBe(false);
    expect(DEFAULT_SRS_SCORING_RULES.leechRule).toBe(false);
    expect(DEFAULT_SRS_SCORING_RULES.ghostReviews).toBe(false);
  });

  it("reads the defaults when nothing is stored", () => {
    expect(parseSrsScoringRules(null)).toEqual(DEFAULT_SRS_SCORING_RULES);
  });

  it("falls back to the defaults rather than crashing on a broken row", () => {
    /* These are read on the path that answers a review. A malformed setting
       must not be able to stop somebody studying. */
    expect(parseSrsScoringRules("{not json")).toEqual(DEFAULT_SRS_SCORING_RULES);
    expect(parseSrsScoringRules('{"leechRule":"yes"}').leechRule).toBe(false);
  });

  it("clamps a number out of range rather than rejecting it", () => {
    expect(parseSrsScoringRules('{"backlogThreshold":999999}').backlogThreshold).toBe(2_000);
    expect(parseSrsScoringRules('{"leechWrongThreshold":1}').leechWrongThreshold).toBe(3);
    expect(parseSrsScoringRules('{"leechMinStage":99}').leechMinStage).toBe(9);
  });

  it("keeps a value it is given inside the bounds", () => {
    const rules = parseSrsScoringRules('{"leechRule":true,"leechWrongThreshold":12}');
    expect(rules).toMatchObject({ leechRule: true, leechWrongThreshold: 12 });
  });
});

describe("what counts as a leech", () => {
  const on = { ...DEFAULT_SRS_SCORING_RULES, leechRule: true, leechWrongThreshold: 8, leechMinStage: 5 };

  it("is nothing at all while the rule is off", () => {
    expect(isLeech({ wrongCount: 40, srsStage: 1 }, DEFAULT_SRS_SCORING_RULES)).toBe(false);
  });

  it("flags an item missed past the threshold", () => {
    expect(isLeech({ wrongCount: 7, srsStage: 2 }, on)).toBe(false);
    expect(isLeech({ wrongCount: 8, srsStage: 2 }, on)).toBe(true);
  });

  it("spares an item that has climbed, whatever its history", () => {
    /* SuperMemo's refinement, and the reason a raw count is not enough: an
       item that survives a long interval has stopped being the problem. */
    expect(isLeech({ wrongCount: 40, srsStage: 5 }, on)).toBe(false);
    expect(isLeech({ wrongCount: 40, srsStage: 4 }, on)).toBe(true);
  });
});

describe("the backlog throttle", () => {
  it("is wired to the lesson queue, not just defined", async () => {
    const { readFileSync } = await import("node:fs");
    const queue = readFileSync("src/lib/uk/ukStudyQueue.ts", "utf8");
    expect(queue).toContain("export async function ukLessonThrottle");
    /* Held rather than hidden: an empty lesson list must never read as
       "you have finished". */
    expect(queue).toContain("if (throttle.held) return [];");
    expect(queue).toContain("throttle,");
  });
});

describe("what a held member is told", () => {
  it("says lessons are on hold and why, rather than showing an empty list", async () => {
    /* A member with no lessons and no explanation reads it as "finished". */
    const { readFileSync } = await import("node:fs");
    const copy = readFileSync("src/app/users/[nickname]/uk-study/UkStudy.constants.ts", "utf8");
    expect(copy).toContain("lessonsHeld:");
    expect(copy).toContain("reviews waiting");
    const session = readFileSync("src/app/users/[nickname]/uk-study/UkStudySession.tsx", "utf8");
    expect(session).toContain("queue.counts.throttle?.held");
  });
});
