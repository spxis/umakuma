import { describe, expect, it } from "vitest";

import { DEFAULT_STUDY_PREFERENCES, STUDY_PRESET_VALUES } from "@/lib/srs/studyPreferences";

import {
  blockedByGate,
  gateAfterLevel,
  jlptCompletedAtLevel,
  mandatoryGateLevels,
  testVerdict,
  UK_TEST_PASS_THRESHOLD,
  verdictClears,
} from "./ukGates";

const never = { ...DEFAULT_STUDY_PREFERENCES, testInterval: 0 as const };
const everyFive = { ...DEFAULT_STUDY_PREFERENCES, testInterval: 5 as const };

describe("which levels carry a gate", () => {
  it("puts a JLPT final at each milestone and nowhere else", () => {
    expect(mandatoryGateLevels()).toEqual([10, 20, 35, 50, 100]);
    expect(jlptCompletedAtLevel(35)).toBe(3);
    expect(jlptCompletedAtLevel(36)).toBeNull();
  });

  it("draws a final from the whole band it certifies", () => {
    /* Level 35 completes N3, and N3 runs from just after N4 finished. The
       claim is about the band, so the questions are too. */
    const gate = gateAfterLevel(35, everyFive);
    expect(gate).toMatchObject({ kind: "jlpt_final", nLevel: 3, mustPass: true, threshold: UK_TEST_PASS_THRESHOLD });
    expect(gate?.drawsFrom).toEqual({ firstLevel: 21, lastLevel: 35 });
  });

  it("draws a checkpoint from the last few levels only", () => {
    /* A checkpoint is about what was just learned, not the whole ladder. */
    expect(gateAfterLevel(15, everyFive)?.drawsFrom).toEqual({ firstLevel: 11, lastLevel: 15 });
  });

  it("lets a JLPT final win where a checkpoint would also fall", () => {
    /* Level 10 is both a milestone and a multiple of five. Asking twelve
       questions about the same material a thirty-question test is about to
       cover would be a waste of the member's evening. */
    expect(gateAfterLevel(10, everyFive)?.kind).toBe("jlpt_final");
  });
});

describe("what a member may decline", () => {
  it("gives no checkpoint to somebody who asked for none", () => {
    expect(gateAfterLevel(15, never)).toBeNull();
  });

  it("still gives them every JLPT final", () => {
    /* Not the member's to decline: "level 35" is a claim that N3 was
       verified, and a level meaning different things on different profiles
       means nothing on any of them. */
    for (const level of mandatoryGateLevels()) {
      expect(gateAfterLevel(level, never)?.kind, `level ${level}`).toBe("jlpt_final");
    }
  });

  it("gives every preset the same finals", () => {
    for (const [name, preferences] of Object.entries(STUDY_PRESET_VALUES)) {
      expect(gateAfterLevel(50, preferences)?.mustPass, name).toBe(true);
    }
  });
});

describe("what holds a member back", () => {
  it("blocks only at a milestone, and only until it is passed", () => {
    expect(blockedByGate(35, [])).toBe(true);
    expect(blockedByGate(35, ["jlpt:3"])).toBe(false);
  });

  it("never blocks on a checkpoint, sat or not", () => {
    /* A checkpoint opens the level whatever the score. Refusing to advance
       somebody who declined one would make it a gate after all. */
    expect(blockedByGate(15, [])).toBe(false);
    expect(blockedByGate(45, [])).toBe(false);
  });
});

describe("what a score is called", () => {
  it("says it in words, and never as a letter or a headline percentage", () => {
    expect(testVerdict(28, 30, 70)).toBe("solid");
    expect(testVerdict(22, 30, 70)).toBe("passed");
    expect(testVerdict(17, 30, 70)).toBe("nearly");
    expect(testVerdict(10, 30, 70)).toBe("not_yet");
  });

  it("calls a near miss nearly, not a failure", () => {
    /* 68 against a bar of 70 is not a failed exam, and the difference in how
       that reads is the difference between coming back tomorrow and not. */
    expect(testVerdict(20, 30, 70)).toBe("nearly");
  });

  it("clears a must-pass gate only on a real pass", () => {
    expect(verdictClears("solid", true)).toBe(true);
    expect(verdictClears("passed", true)).toBe(true);
    expect(verdictClears("nearly", true)).toBe(false);
    /* A checkpoint clears on having been sat at all. */
    expect(verdictClears("not_yet", false)).toBe(true);
  });

  it("has nothing to say about a test with no questions", () => {
    expect(testVerdict(0, 0, 70)).toBe("not_yet");
  });
});

/**
 * A final stands where the band finishes on the ladder being climbed.
 *
 * The gate functions defaulted to UN's milestones and nothing could tell them
 * otherwise, so the UG ordering - where N4 finishes at 43, not 20 - would have
 * had its N4 final at level 20, twenty-three levels before its kanji.
 */
describe("gates follow the ladder's milestones", () => {
  const ug = [{ nLevel: 5, completeAtLevel: 7 }, { nLevel: 4, completeAtLevel: 43 }];

  it("puts the N4 final at 43 on UG and nowhere near 20", () => {
    expect(gateAfterLevel(43, DEFAULT_STUDY_PREFERENCES, ug)?.gateKey).toBe("jlpt:4");
    expect(gateAfterLevel(20, DEFAULT_STUDY_PREFERENCES, ug)?.kind).not.toBe("jlpt_final");
  });

  it("draws the UG final from the UG band, not UN's", () => {
    const final = gateAfterLevel(43, DEFAULT_STUDY_PREFERENCES, ug);
    expect(final?.drawsFrom).toEqual({ firstLevel: 8, lastLevel: 43 });
  });

  it("blocks on UG's level and not on UN's", () => {
    expect(blockedByGate(43, [], ug)).toBe(true);
    expect(blockedByGate(20, [], ug)).toBe(false);
    expect(blockedByGate(43, ["jlpt:4"], ug)).toBe(false);
  });

  it("keeps UN as the default so the older callers are unchanged", () => {
    expect(mandatoryGateLevels()).toEqual([10, 20, 35, 50, 100]);
    expect(mandatoryGateLevels(ug)).toEqual([7, 43]);
  });
});
