import { describe, expect, it } from "vitest";

import { levelForJlpt } from "@/lib/kanjiLadder";

import { addSplit, EMPTY_SPLIT, SIM_BATCH_SIZE, simDayXp, splitTotal } from "./simEconomy";
import { XP_AWARDS, XP_BONUSES, XP_DAILY_CAPS } from "./xpAwards";

const quietDay = {
  reviews: 0, correct: 0, lessons: 0, games: 0, cleanBatches: 0, burns: 0,
  streak: 1, levelsGained: 0, levelBefore: 5, levelAfter: 5, sitsExams: false, passesExams: false,
};

describe("simDayXp", () => {
  it("pays for showing up even on a day nothing else happened", () => {
    expect(simDayXp(quietDay).streaks).toBe(XP_AWARDS.dailySignIn);
  });

  it("pays for answering and again for being right", () => {
    const day = simDayXp({ ...quietDay, reviews: 50, correct: 40 });
    expect(day.reviews).toBe(50 * XP_AWARDS.reviewAnswered + 40 * XP_AWARDS.reviewCorrect);
  });

  it("caps lessons and clean batches, which is what makes them a garnish", () => {
    const heavy = simDayXp({ ...quietDay, lessons: 200, burns: 50, cleanBatches: 40 });
    expect(heavy.lessons).toBe(XP_DAILY_CAPS.lessonLearned);
    /* Burning is not capped - John's decision - so a day of fifty burns pays
       for fifty. The simulator has to model that or the curve is calibrated
       against an economy the site does not have. */
    expect(heavy.quality).toBe((XP_DAILY_CAPS.cleanSession ?? 0) + XP_BONUSES.burnedItem * 50);
  });

  it("pays the weekly streak on the seventh day and the milestone on top", () => {
    const seventh = simDayXp({ ...quietDay, streak: 7 });
    expect(seventh.streaks).toBe(XP_AWARDS.dailySignIn + XP_AWARDS.weeklyStreak + XP_BONUSES.sevenDayStreak);
    expect(simDayXp({ ...quietDay, streak: 8 }).streaks).toBe(XP_AWARDS.dailySignIn);
  });

  it("pays a JLPT band once, on the level that completes it", () => {
    const n5 = levelForJlpt(5)!;
    const crossing = simDayXp({ ...quietDay, levelsGained: 1, levelBefore: n5 - 1, levelAfter: n5 });
    expect(crossing.levels).toBe(XP_AWARDS.curriculumLevelGained + XP_BONUSES.n5Complete);
    const after = simDayXp({ ...quietDay, levelsGained: 1, levelBefore: n5, levelAfter: n5 + 1 });
    expect(after.levels).toBe(XP_AWARDS.curriculumLevelGained);
  });

  it("pays a level test only to somebody who sits one, and the pass only if they pass", () => {
    const sat = simDayXp({ ...quietDay, levelsGained: 1, levelBefore: 5, levelAfter: 6, sitsExams: true, passesExams: false });
    expect(sat.levels).toBe(XP_AWARDS.curriculumLevelGained + XP_AWARDS.levelTestWritten);
    const passed = simDayXp({ ...quietDay, levelsGained: 1, levelBefore: 5, levelAfter: 6, sitsExams: true, passesExams: true });
    expect(passed.levels).toBe(sat.levels + XP_AWARDS.levelTestPassed);
  });

  it("holds a modelled batch at ten, the size the clean bonus is priced for", () => {
    expect(SIM_BATCH_SIZE).toBe(10);
  });
});

describe("splitting", () => {
  it("adds up to the whole and starts at nothing", () => {
    expect(splitTotal(EMPTY_SPLIT)).toBe(0);
    const running = { ...EMPTY_SPLIT };
    addSplit(running, simDayXp({ ...quietDay, reviews: 10, correct: 8 }));
    addSplit(running, simDayXp({ ...quietDay, reviews: 10, correct: 8 }));
    expect(running.reviews).toBe(36);
    expect(splitTotal(running)).toBe(36 + 2 * XP_AWARDS.dailySignIn);
  });
});
