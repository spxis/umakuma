import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { initialLessonState, nextSrsStage, nextStageAvailableAt } from "@/lib/srs/srsSchedule";

import { UK_LEVEL_PASS_SRS_STAGE } from "./ukLevel";

/**
 * The SRS engine the UmaKuma ladder runs on, which is WaniKani's schedule
 * shared rather than copied.
 */
describe("the shared schedule", () => {
  it("moves up one stage on a correct answer and stops at nine", () => {
    expect(nextSrsStage({ currentStage: 4, result: "correct" })).toBe(5);
    expect(nextSrsStage({ currentStage: 9, result: "correct" })).toBe(9);
  });

  it("drops back on a wrong answer rather than resetting to zero", () => {
    /* Losing four months of work to one slip is how a member stops coming. */
    expect(nextSrsStage({ currentStage: 8, result: "wrong" })).toBe(7);
    expect(nextSrsStage({ currentStage: 1, result: "wrong" })).toBe(1);
  });

  it("starts a lesson at apprentice with a four-hour wait", () => {
    const now = new Date("2026-09-04T00:00:00Z");
    const state = initialLessonState(now);
    expect(state.srsStage).toBe(1);
    expect(state.availableAt?.getTime()).toBe(now.getTime() + 4 * 60 * 60 * 1000);
  });

  it("gives the burned stage no next review", () => {
    expect(nextStageAvailableAt(9)).toBeNull();
  });

  it("is shared, not copied — one interval table for both ladders", () => {
    /* It lived in customStudy/ because an uploaded library needed a scheduler
       first. Two copies is how they start disagreeing, and a WaniKani member's
       imported stages only line up with ours if there is exactly one scale. */
    const custom = readFileSync("src/lib/customStudy/customStudyQueue.ts", "utf8");
    expect(custom).toContain("@/lib/srs/srsSchedule");
    const write = readFileSync("src/lib/uk/ukStudyWrite.ts", "utf8");
    expect(write).toContain("@/lib/srs/srsSchedule");
  });

  it("stamps passedAt at Guru and never clears it", () => {
    /* This is what lets a level stay cleared when an item later falls back:
       one wrong answer must not un-learn a level. */
    const write = readFileSync("src/lib/uk/ukStudyWrite.ts", "utf8");
    expect(write).toContain("passedAt: state.passedAt ??");
    expect(UK_LEVEL_PASS_SRS_STAGE).toBe(5);
  });

  it("checks a lesson's level server-side rather than trusting the request", () => {
    /* A crafted body would otherwise open the whole hundred levels at once. */
    const write = readFileSync("src/lib/uk/ukStudyWrite.ts", "utf8");
    expect(write).toContain("level: { lte: account?.ukLevel ?? 1 }");
  });

  it("never copies WaniKani's mnemonics into our rows", () => {
    /* Their copyrighted text. Connected members see it on WaniKani's own
       surfaces; our curriculum rows carry meanings and readings only. */
    const queue = readFileSync("src/lib/uk/ukStudyQueue.ts", "utf8");
    expect(queue).not.toContain("meaningExplanation");
    expect(queue).not.toContain("readingExplanation");
  });
});


describe("the latch, shown", () => {
  it("carries whether an item has ever passed, separately from its stage", () => {
    /* John: "We should have a flag that shows if a kanji is latched or not."
       The level gate already counts items that have ever reached Guru; this
       makes that fact visible on the item, so a member seeing stage 2 with
       "Passed" beside it knows the level is safe and knows why. */
    const queue = readFileSync("src/lib/uk/ukStudyQueue.ts", "utf8");
    expect(queue).toContain("passed: boolean;");
    expect(queue).toContain("select: { subjectId: true, srsStage: true, passedAt: true }");
    const session = readFileSync("src/app/users/[nickname]/uk-study/UkStudySession.tsx", "utf8");
    expect(session).toContain("item.passed ?");
  });

  it("derives it from passedAt and nothing else", () => {
    /* Not from the current stage: an item at stage 6 that was never stamped
       would be a bug worth seeing, and an item at stage 2 that was stamped is
       the whole point. */
    const queue = readFileSync("src/lib/uk/ukStudyQueue.ts", "utf8");
    expect(queue).toContain("state?.passedAt !== null && state?.passedAt !== undefined");
  });
});

describe("the mechanisms log", () => {
  it("exists, and says what we have and do not have for every category", () => {
    /* John: "log them and say what we have and what we don't have, that way if
       we ever revisit our system we can say, oh, why didn't we do that?" */
    const log = readFileSync("docs/SRS_MECHANISMS.md", "utf8");
    for (const category of ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"]) {
      expect(log, `category ${category}`).toMatch(new RegExp(`^\\| ${category} \\|`, "m"));
    }
    for (const verdict of ["**have**", "**partial**", "**don't**", "**won't**"]) {
      expect(log).toContain(verdict);
    }
    expect(log).toContain("The one that matters most: the level gate is a latch");
  });
});
