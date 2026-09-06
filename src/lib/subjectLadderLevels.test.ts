import { describe, expect, it } from "vitest";

import { SUBJECT_TYPES } from "./domainConstants";
import { jlptBadge, schoolGradeBadge, ugLevelBadge, unLevelBadge, wkLevelBadge } from "./levelBadge";
import { subjectLadderLevels } from "./subjectLadderLevels";

/**
 * A level says which ladder it is on, and there are five answers.
 *
 * The lane knew only WaniKani's, so anything WaniKani never taught showed
 * nothing at all - which is most of what a member can put on a list.
 */
describe("the ladders a subject is on", () => {
  it("places a joyo kanji on both of ours, and names its school year", () => {
    const levels = subjectLadderLevels({ subjectType: SUBJECT_TYPES.kanji, characters: "水", subjectId: 479 });
    expect(levels.unLevel).toBeGreaterThan(0);
    expect(levels.ugLevel).toBeGreaterThan(0);
    expect(levels.schoolGrade).toBe(1);
  });

  /* A word is keyed by WaniKani's id on both ladders, not by its characters. */
  it("gives a word no school year, since a year teaches kanji", () => {
    const levels = subjectLadderLevels({ subjectType: SUBJECT_TYPES.vocabulary, characters: "大人", subjectId: 2467 });
    expect(levels.schoolGrade).toBeNull();
  });

  it("answers null rather than guessing for a character neither ladder teaches", () => {
    const levels = subjectLadderLevels({ subjectType: SUBJECT_TYPES.kanji, characters: "鑫", subjectId: null });
    expect(levels).toEqual({ unLevel: null, ugLevel: null, schoolGrade: null });
  });
});

describe("what a level badge prints", () => {
  it("prefixes every ladder, so no number is bare", () => {
    expect(unLevelBadge(20)).toBe("UN20");
    expect(ugLevelBadge(12)).toBe("UG12");
    expect(wkLevelBadge(17)).toBe("WK17");
    expect(jlptBadge(5)).toBe("N5");
    expect(schoolGradeBadge(2)).toBe("G2");
  });

  /* Null, not a zero: an unlevelled subject is not on level zero. */
  it("says nothing where there is no level", () => {
    expect(unLevelBadge(null)).toBeNull();
    expect(jlptBadge(null)).toBeNull();
    expect(schoolGradeBadge(undefined)).toBeNull();
  });
});
