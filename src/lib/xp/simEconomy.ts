import { jlptCompletedAt } from "@/lib/kanjiLadder";

import {
  cleanSessionUnits,
  jlptMilestoneFor,
  streakMilestoneFor,
  XP_AWARDS,
  XP_BONUSES,
  XP_DAILY_CAPS,
} from "./xpAwards";
import type { SimXpSplit } from "./simTypes";

/**
 * What a day of study is worth, split by what earned it.
 *
 * Separate from the engine because the engine's job is the schedule and this
 * one's is the money, and mixing them is how the last model came to leave half
 * the economy out. Clean batches, burns and the JLPT bands were priced in
 * `xpAwards.ts`, modelled in the closed-form pacing file, and then simply not
 * simulated — so every persona's XP was low by the exact amount the curve had
 * been calibrated to include.
 *
 * Caps are applied here, per day, the way `xpAwardValue` applies them at the
 * real award site. Leaving them off is what makes a burn bonus quietly worth
 * more than the whole routine day it garnishes.
 */

/** How many items a modelled sitting holds, for the clean-batch bonus. */
export const SIM_BATCH_SIZE = 10;

export const EMPTY_SPLIT: SimXpSplit = { reviews: 0, lessons: 0, games: 0, levels: 0, streaks: 0, quality: 0 };

function capped(value: number, cap: number | undefined): number {
  return cap === undefined ? value : Math.min(value, cap);
}

export type SimDayEarnings = {
  reviews: number;
  correct: number;
  lessons: number;
  games: number;
  /** Batches of `SIM_BATCH_SIZE` finished with nothing wrong in them. */
  cleanBatches: number;
  burns: number;
  streak: number;
  levelsGained: number;
  levelBefore: number;
  levelAfter: number;
  sitsExams: boolean;
  /** Passing a level test is modelled as a run of accurate answers. */
  passesExams: boolean;
};

/** What one studied day paid, by source. Nothing here writes anything. */
export function simDayXp(day: SimDayEarnings): SimXpSplit {
  const reviews = day.reviews * XP_AWARDS.reviewAnswered + day.correct * XP_AWARDS.reviewCorrect;

  const lessons = capped(day.lessons * XP_AWARDS.lessonLearned, XP_DAILY_CAPS.lessonLearned);
  const games = day.games * XP_AWARDS.gameFinished;

  let levels = day.levelsGained * XP_AWARDS.curriculumLevelGained;
  if (day.sitsExams) {
    levels += day.levelsGained * XP_AWARDS.levelTestWritten;
    if (day.passesExams) levels += day.levelsGained * XP_AWARDS.levelTestPassed;
  }
  if (day.levelAfter > day.levelBefore) {
    const reached = jlptCompletedAt(day.levelAfter);
    /* Only a band they did not already hold — the level is re-derived every
       day, so "you have N4" is true far more often than "you just earned N4". */
    if (reached !== null && reached !== jlptCompletedAt(day.levelBefore)) {
      const kind = jlptMilestoneFor(reached);
      if (kind) levels += XP_BONUSES[kind];
    }
  }

  let streaks = XP_AWARDS.dailySignIn;
  if (day.streak > 0 && day.streak % 7 === 0) streaks += XP_AWARDS.weeklyStreak;
  const milestone = streakMilestoneFor(day.streak);
  if (milestone) streaks += XP_BONUSES[milestone];

  const clean = capped(
    day.cleanBatches * cleanSessionUnits(SIM_BATCH_SIZE) * XP_BONUSES.cleanSession,
    XP_DAILY_CAPS.cleanSession,
  );
  const burns = capped(day.burns * XP_BONUSES.burnedItem, XP_DAILY_CAPS.burnedItem);

  return { reviews, lessons, games, levels, streaks, quality: clean + burns };
}

export function addSplit(into: SimXpSplit, add: SimXpSplit): void {
  into.reviews += add.reviews;
  into.lessons += add.lessons;
  into.games += add.games;
  into.levels += add.levels;
  into.streaks += add.streaks;
  into.quality += add.quality;
}

export function splitTotal(split: SimXpSplit): number {
  return split.reviews + split.lessons + split.games + split.levels + split.streaks + split.quality;
}
