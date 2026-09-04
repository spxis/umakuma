import { describe, expect, it } from "vitest";

import {
  bumpCurriculumVersion,
  classifyCurriculumBump,
  CURRICULUM_VERSION_START,
  describeCurriculumDiff,
  diffCurriculum,
  type LadderShape,
} from "./curriculumVersion";

const base: LadderShape = {
  kanji: { 一: 2, 人: 2, 語: 10 },
  radicals: { 丿: 1, 口: 3 },
  vocabulary: { "440": 3, "441": 5 },
};

const shape = (over: Partial<LadderShape>): LadderShape => ({ ...base, ...over });

describe("what moves the curriculum version", () => {
  it("starts at 1.0.0", () => {
    expect(CURRICULUM_VERSION_START).toBe("1.0.0");
  });

  it("calls a moved kanji major, because a level is gated on kanji alone", () => {
    /* This is the whole rule: a member's level is derived from 90% of each
       level's kanji, so one kanji moving is the only kind of change that can
       alter where somebody stands. */
    const diff = diffCurriculum(base, shape({ kanji: { 一: 2, 人: 2, 語: 9 } }));
    expect(diff.kanji.moved).toEqual(["語"]);
    expect(classifyCurriculumBump(diff)).toBe("major");
    expect(bumpCurriculumVersion("1.4.2", "major")).toBe("2.0.0");
  });

  it("calls an added or removed kanji major too", () => {
    expect(classifyCurriculumBump(diffCurriculum(base, shape({ kanji: { ...base.kanji, 火: 12 } })))).toBe("major");
    expect(classifyCurriculumBump(diffCurriculum(base, shape({ kanji: { 一: 2, 人: 2 } })))).toBe("major");
  });

  it("calls radicals or words alone minor — the work changes, the levels do not", () => {
    const radicals = diffCurriculum(base, shape({ radicals: { 丿: 1, 口: 4 } }));
    expect(classifyCurriculumBump(radicals)).toBe("minor");
    const words = diffCurriculum(base, shape({ vocabulary: { "440": 3, "441": 5, "442": 7 } }));
    expect(classifyCurriculumBump(words)).toBe("minor");
    expect(bumpCurriculumVersion("1.4.2", "minor")).toBe("1.5.0");
  });

  it("leaves the version alone when nothing taught has changed", () => {
    expect(classifyCurriculumBump(diffCurriculum(base, base))).toBe("none");
    expect(bumpCurriculumVersion("1.4.2", "none")).toBe("1.4.2");
  });

  it("keeps the third number for text-only edits", () => {
    /* John asked for it specifically, so a wording fix is not dressed up as a
       curriculum change. */
    expect(bumpCurriculumVersion("1.4.2", "patch")).toBe("1.4.3");
  });

  it("says what changed in words a member can read", () => {
    const diff = diffCurriculum(base, shape({ kanji: { 一: 2, 人: 2, 語: 9, 火: 12 }, vocabulary: {} }));
    expect(describeCurriculumDiff(diff)).toBe("1 kanji added, 1 kanji moved, 2 words changed");
    expect(describeCurriculumDiff(diffCurriculum(base, base))).toBe("no change to what is taught");
  });
});
