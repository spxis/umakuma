import { describe, expect, it } from "vitest";

import { levelForJlpt } from "@/lib/kanjiLadder";

import { XP_BONUSES } from "./xpAwards";
import {
  cleanSessionXpAwards,
  lessonXpAwards,
  reviewXpAwards,
  streakXpAwards,
} from "./xpStudyAwards";

const kinds = (awards: { kind: string }[]) => awards.map((award) => award.kind);

/**
 * What each thing a member does is worth, decided without a database.
 *
 * The rules are the part worth testing: which awards an answer earns, and -
 * more importantly - which ones it must *not* earn twice. Both milestones here
 * fire off state that is re-derived on every single answer, so "you have N4"
 * is true thousands of times and "you have just earned N4" is true once.
 */
describe("what one review earns", () => {
  const flat = { burnedNow: false, levelBefore: 4, levelAfter: 4 };

  it("pays for answering whether or not it was right", () => {
    expect(kinds(reviewXpAwards({ ...flat, correct: false }))).toEqual(["reviewAnswered"]);
  });

  it("pays again on top for getting it right", () => {
    expect(kinds(reviewXpAwards({ ...flat, correct: true }))).toEqual(["reviewAnswered", "reviewCorrect"]);
  });

  it("pays the burn bonus on the answer that reaches the top stage", () => {
    const awards = reviewXpAwards({ ...flat, correct: true, burnedNow: true });
    expect(kinds(awards)).toContain("burnedItem");
  });

  it("does not pay for a level that did not move", () => {
    const awards = reviewXpAwards({ correct: true, burnedNow: false, levelBefore: 20, levelAfter: 20 });
    expect(kinds(awards)).toEqual(["reviewAnswered", "reviewCorrect"]);
  });

  it("pays a JLPT band on the answer that crosses into it, and only then", () => {
    const n4At = levelForJlpt(4)!;
    const crossing = reviewXpAwards({ correct: true, burnedNow: false, levelBefore: n4At - 1, levelAfter: n4At });
    expect(kinds(crossing)).toContain("n4Complete");

    /* The level after the crossing still *has* N4. Paying again there is the
       failure this guards: the level is re-derived on every answer. */
    const past = reviewXpAwards({ correct: true, burnedNow: false, levelBefore: n4At, levelAfter: n4At + 1 });
    expect(kinds(past)).not.toContain("n4Complete");
  });

  it("says which band it was, so a history line can explain itself", () => {
    const n5At = levelForJlpt(5)!;
    const awards = reviewXpAwards({ correct: true, burnedNow: false, levelBefore: n5At - 1, levelAfter: n5At });
    const milestone = awards.find((award) => award.kind === "n5Complete");
    expect(milestone?.note).toBe(`Level ${n5At}, N5 complete.`);
  });

  it("leaves the routine level award alone, because the pacing model has not got it", () => {
    /* Wiring `curriculumLevelGained` would put another ~10 XP a day on the
       reference learner and take them under the three-year target. It wants
       doing with `balanceSimulator.ts`, not beside it. */
    const awards = reviewXpAwards({ correct: true, burnedNow: false, levelBefore: 3, levelAfter: 4 });
    expect(kinds(awards)).not.toContain("curriculumLevelGained");
  });
});

describe("what an award says it was for", () => {
  /*
   * The three review awards are all about the item answered, and saying so is
   * what lets a history row answer "which kanji did I get the points for".
   * `times` alone is a count, and a count was the whole problem.
   */
  it("names the item on every award that is about it", () => {
    const awards = reviewXpAwards({
      correct: true,
      burnedNow: true,
      levelBefore: 1,
      levelAfter: 1,
      subjectId: 8_412,
    });
    expect(kinds(awards)).toEqual(["reviewAnswered", "reviewCorrect", "burnedItem"]);
    for (const award of awards) expect(award.subjectIds).toEqual([8_412]);
  });

  /* A caller that has no item - the WaniKani feed before it knew one - must
     still award, and the award simply carries no subject rather than a wrong
     one. */
  it("carries no subject when the caller has none", () => {
    const awards = reviewXpAwards({ correct: true, burnedNow: false, levelBefore: 1, levelAfter: 1 });
    for (const award of awards) expect(award.subjectIds).toBeUndefined();
  });

  /* A JLPT band is not an item. Nothing should invent a link for it. */
  it("leaves the milestone without one, because a band is not a character", () => {
    const awards = reviewXpAwards({
      correct: true,
      burnedNow: false,
      levelBefore: 19,
      levelAfter: 20,
      subjectId: 8_412,
    });
    const milestone = awards.find((award) => award.kind !== "reviewAnswered" && award.kind !== "reviewCorrect");
    if (milestone) expect(milestone.subjectIds).toBeUndefined();
  });
});

describe("what a batch of lessons earns", () => {
  it("pays once per item actually started, and names them", () => {
    /* The items rather than the count: lessons cap at thirty a day, and a
       count cannot say which of a batch of forty went unpaid. */
    expect(lessonXpAwards([11, 22, 33])).toEqual([
      { kind: "lessonLearned", times: 3, subjectIds: [11, 22, 33] },
    ]);
  });

  it("pays nothing when a resent request opened nothing", () => {
    expect(lessonXpAwards([])).toEqual([]);
  });
});

describe("what a clean session earns", () => {
  it("pays nothing when anything was wrong", () => {
    expect(cleanSessionXpAwards({ size: 40, wrong: 1 })).toEqual([]);
  });

  it("pays nothing for a batch too small to be a session", () => {
    expect(cleanSessionXpAwards({ size: 2, wrong: 0 })).toEqual([]);
  });

  it("pays more for a bigger flawless batch, in units under the day's cap", () => {
    const ten = cleanSessionXpAwards({ size: 10, wrong: 0 })[0];
    const forty = cleanSessionXpAwards({ size: 40, wrong: 0 })[0];
    expect(ten.kind).toBe("cleanSession");
    expect(forty.times!).toBeGreaterThan(ten.times! * 4);
    expect(ten.note).toBe("10 reviews, none wrong.");
  });
});

describe("what a streak earns", () => {
  it("pays on the milestone day and no other", () => {
    expect(kinds(streakXpAwards(7))).toEqual(["sevenDayStreak"]);
    expect(streakXpAwards(8)).toEqual([]);
    expect(streakXpAwards(365)[0].note).toBe("365 days in a row.");
  });

  it("is worth more the longer it has been held", () => {
    expect(XP_BONUSES.yearLongStreak).toBeGreaterThan(XP_BONUSES.sevenDayStreak);
  });
});
