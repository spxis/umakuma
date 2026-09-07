import { describe, expect, it } from "vitest";

import { LADDER_STREAMS } from "@/lib/ladder/ladderStreams";

import { studyLevelHeaderLabel } from "./StudyExplorer.constants";

/*
 * The panel header prints "UmaKuma (UN3)" - and printed exactly that at a
 * member on the school ladder, whose standing is UG3 and is a different
 * number against a different curriculum. The queue had picked the right
 * column for years; only the prefix was wrong, which is the worst version of
 * this bug because the number looks right.
 */
describe("the level in the study panel header", () => {
  it("names the ladder the member is actually on", () => {
    expect(studyLevelHeaderLabel("umakuma", 3, LADDER_STREAMS.ug)).toBe("UG3");
    expect(studyLevelHeaderLabel("umakuma", 3, LADDER_STREAMS.un)).toBe("UN3");
  });

  it("falls back to the exam ladder when nobody is signed in", () => {
    expect(studyLevelHeaderLabel("umakuma", 3, null)).toBe("UN3");
  });

  it("leaves the other two sources alone", () => {
    expect(studyLevelHeaderLabel("wanikani", 17, LADDER_STREAMS.ug)).toBe("WK17");
    /* A member's own upload is on neither ladder, so the stream says nothing
       about it. */
    expect(studyLevelHeaderLabel("custom", 2, LADDER_STREAMS.ug)).toBe("LIB2");
  });
});
