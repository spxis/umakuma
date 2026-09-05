import { describe, expect, it } from "vitest";

import {
  GRADE_LADDER_LEVELS,
  SCHOOL_GRADES,
  gradeLadderLevel,
  gradeMilestones,
  gradeOfLevel,
  gradePlacement,
  gradeRadicalLevel,
  gradeVocabularyLevel,
  jlptMilestonesOnGradeLadder,
} from "./gradeLadder";
import { kanjiPlacement } from "./kanjiLadder";
import gradeLadderData from "@/data/gradeLadder.json";
import type { GradeLadder } from "./gradeLadder.types";

/* The file itself, for the checks that have to sweep every character. */
const everyPlacement = () => Object.entries((gradeLadderData as GradeLadder).kanjiLevel);

/*
 * UG is the same curriculum in a different order, so what is asserted here is
 * the promise the order exists to keep — not the placements themselves, which
 * are recomputed from the sources on every build.
 */
describe("the grade ladder", () => {
  it("teaches the same characters as the exam ladder", () => {
    expect(GRADE_LADDER_LEVELS).toBe(100);
    /* Every kanji on one ladder is on the other; only the level differs. */
    for (const character of ["土", "士", "私", "鬱", "苺"]) {
      expect(gradePlacement(character), character).not.toBeNull();
      expect(kanjiPlacement(character), character).not.toBeNull();
    }
  });

  /*
   * The point of dividing a grade rather than ramping through it: "you have
   * finished grade three" has to be true at a level boundary, or the milestone
   * is an approximation and the stream has no promise to make.
   */
  it("finishes every school year on a level boundary, in order", () => {
    const milestones = gradeMilestones();
    expect(milestones.map((entry) => entry.grade)).toEqual([...SCHOOL_GRADES]);

    let previous = 0;
    for (const milestone of milestones) {
      expect(milestone.completeAtLevel, `grade ${milestone.grade}`).toBeGreaterThan(previous);
      /* And the milestone means what it says: no character of that school year
         sits past the level the ladder claims the year is finished at. */
      const stragglers = everyPlacement()
        .filter(([, placement]) => placement.schoolGrade === milestone.grade)
        .filter(([, placement]) => placement.level > milestone.completeAtLevel)
        .map(([character]) => character);
      expect(stragglers, `grade ${milestone.grade} past UG${milestone.completeAtLevel}`).toEqual([]);
      previous = milestone.completeAtLevel;
    }
    /* The kyōiku set is finished about half way, which is what leaves room for
       the top-up and the secondary characters behind it. */
    expect(previous).toBeLessThanOrEqual(60);
  });

  it("holds the 2020 kyōiku counts exactly", () => {
    expect(gradeMilestones().map((entry) => entry.kanji)).toEqual([80, 160, 200, 202, 193, 191]);
  });

  /*
   * Grade one is written with 74 distinct radicals. A first level of twenty
   * kanji would arrive carrying pieces nobody had seen, so level 1 is radicals
   * and nothing else — the same answer the exam ladder gives.
   */
  it("opens on radicals alone", () => {
    expect(gradeLadderLevel(1)?.kanji).toEqual([]);
    expect(gradeLadderLevel(1)!.radicals).toBeGreaterThan(0);
    expect(gradeOfLevel(1)).toBeNull();
    expect(gradeLadderLevel(2)!.kanji.length).toBeGreaterThan(0);
  });

  it("never lets a level straddle two school years", () => {
    for (let level = 2; level <= GRADE_LADDER_LEVELS; level += 1) {
      const entry = gradeLadderLevel(level)!;
      const grades = new Set(
        entry.kanji
          .map((kanji) => gradePlacement(kanji)?.schoolGrade ?? null)
          .filter((grade): grade is number => grade !== null && grade <= 6),
      );
      expect(grades.size, `level ${level}`).toBeLessThanOrEqual(1);
    }
  });

  /* A radical arrives before the kanji that needs it; a word after every kanji
     in it. Both are the placement rules the exam ladder already runs, reused. */
  it("teaches a radical before the character it is part of", () => {
    for (const [character, placement] of Object.entries({ 語: gradePlacement("語")! })) {
      for (const radical of ["口", "五", "言"]) {
        const radicalLevel = gradeRadicalLevel(radical);
        if (radicalLevel === null) continue;
        expect(radicalLevel, `${radical} before ${character}`).toBeLessThan(placement.level);
      }
    }
  });

  it("unlocks a word only once every kanji in it is taught", () => {
    /* 一日 — both characters are grade 1, so the word cannot precede level 2. */
    const level = gradeVocabularyLevel(2469);
    if (level !== null) expect(level).toBeGreaterThan(1);
  });

  /*
   * The comparison a member switching ladders is making. Both are recorded so
   * neither has to be recomputed by a surface that wants to show them.
   */
  it("records where the exam bands land on it", () => {
    const bands = jlptMilestonesOnGradeLadder();
    expect(bands.map((entry) => entry.nLevel)).toEqual([5, 4, 3, 2, 1]);
    const n5 = bands.find((entry) => entry.nLevel === 5)!;
    const n2 = bands.find((entry) => entry.nLevel === 2)!;
    /* N5 lands early on both ladders; N2 is where they diverge most. */
    expect(n5.completeAtLevel).toBeLessThan(15);
    expect(n2.completeAtLevel).toBeGreaterThan(50);
  });

  it("carries a level's own subjects, not only its kanji", () => {
    const totals = Array.from({ length: GRADE_LADDER_LEVELS }, (_, index) => {
      const entry = gradeLadderLevel(index + 1)!;
      return entry.kanji.length + entry.vocabulary + entry.radicals;
    });
    /* Comparable to the exam ladder, which runs 34-105 subjects a level. */
    expect(Math.max(...totals)).toBeLessThanOrEqual(130);
    expect(Math.min(...totals)).toBeGreaterThan(20);
  });
});
