import { KANJI_LADDER_LEVELS } from "@/lib/kanjiLadder";
import { UK_LEVEL_UNLOCK_THRESHOLD } from "@/lib/uk/ukLevel";

import { cleanSessionUnits, XP_AWARDS, XP_BONUSES, XP_DAILY_CAPS } from "./xpAwards";
import { xpForLevel, XP_RANKS } from "./xpCurve";
import { gamesPerDayAt } from "./xpEntitlements";

/**
 * How long each kind of learner takes on each of the two ladders.
 *
 * The two are deliberately independent — the curriculum level is knowledge and
 * the XP rank is dedication — and the reason to model them together is that
 * the *gap* between them is what a member feels. Somebody grinding reviews of
 * things they already know climbs the XP ladder fast and the curriculum ladder
 * slowly; somebody who already reads Japanese does the reverse. Both are
 * legitimate, and neither should feel like the system is ignoring them.
 *
 * This is a model, not a measurement: nobody has used the site yet. Its job is
 * to keep the numbers honest against intent, so that a change to an award or
 * an interval shows up here as "the casual learner now needs eleven years"
 * before it ships rather than after somebody notices.
 */

export type LearnerProfile = {
  id: string;
  label: string;
  /** Days a week they open the site. */
  daysPerWeek: number;
  /** Reviews answered on a day they show up. */
  reviewsPerDay: number;
  /** Share of reviews answered correctly, which drives both ladders. */
  accuracy: number;
  /** New items started on a day they show up. */
  lessonsPerDay: number;
  gamesPerDay: number;
};

/**
 * Five people, chosen to bracket the range rather than to average it.
 *
 * The two ends are the ones that matter: a system tuned only for the person in
 * the middle quietly tells the other four that it was not built for them.
 */
export const LEARNER_PROFILES: LearnerProfile[] = [
  {
    id: "devoted",
    label: "Devoted — every day, a full session",
    daysPerWeek: 7, reviewsPerDay: 100, accuracy: 0.85, lessonsPerDay: 15, gamesPerDay: 2,
  },
  {
    id: "steady",
    label: "Steady — most days, a proper sitting",
    daysPerWeek: 6, reviewsPerDay: 50, accuracy: 0.85, lessonsPerDay: 10, gamesPerDay: 2,
  },
  {
    id: "commuter",
    label: "Commuter — weekdays, a short burst",
    daysPerWeek: 5, reviewsPerDay: 25, accuracy: 0.8, lessonsPerDay: 5, gamesPerDay: 1,
  },
  {
    id: "weekend",
    label: "Weekend — two long sittings",
    daysPerWeek: 2, reviewsPerDay: 120, accuracy: 0.8, lessonsPerDay: 20, gamesPerDay: 2,
  },
  {
    id: "gamer",
    label: "Gamer — turns up for the games, reviews little",
    daysPerWeek: 6, reviewsPerDay: 10, accuracy: 0.75, lessonsPerDay: 2, gamesPerDay: 2,
  },
];

/**
 * How many items a sitting holds, for the clean-session model.
 *
 * `UK_STUDY_BATCH` in the study page's constants, restated rather than
 * imported: a model in `lib/` reaching into `app/` for a number is the wrong
 * direction, and this one is an assumption about behaviour rather than a
 * setting the model has to track.
 */
const MODELLED_BATCH = 10;

const STREAK_MILESTONE_TOTAL =
  XP_BONUSES.sevenDayStreak +
  XP_BONUSES.thirtyDayStreak +
  XP_BONUSES.hundredDayStreak +
  XP_BONUSES.yearLongStreak;

const JLPT_BONUS_TOTAL =
  XP_BONUSES.n5Complete +
  XP_BONUSES.n4Complete +
  XP_BONUSES.n3Complete +
  XP_BONUSES.n2Complete +
  XP_BONUSES.n1Complete;

const DAYS_IN_YEAR = 365;

/**
 * The routine economy: what a profile earns for doing the thing at all.
 *
 * Takes the rank because the rank changes the answer — `gamesPerDayAt` unlocks
 * more games a day as somebody climbs, so the same person earns more at rank
 * 75 than at rank 5 doing otherwise identical things.
 */
export function routineXpPerActiveDay(profile: LearnerProfile, xpLevel = 1): number {
  const reviews =
    profile.reviewsPerDay * XP_AWARDS.reviewAnswered +
    Math.round(profile.reviewsPerDay * profile.accuracy) * XP_AWARDS.reviewCorrect;
  const lessons = Math.min(profile.lessonsPerDay, 30) * XP_AWARDS.lessonLearned;
  const games = Math.min(profile.gamesPerDay, gamesPerDayAt(xpLevel)) * XP_AWARDS.gameFinished;
  const streak = profile.daysPerWeek >= 7 ? XP_AWARDS.weeklyStreak / 7 : 0;
  return XP_AWARDS.dailySignIn + reviews + lessons + games + streak;
}

/**
 * The bonus economy, at the rate it actually fires.
 *
 * Bonuses are not free XP sitting outside the model - they are earned by the
 * same behaviour the profiles already describe, so the honest thing is to work
 * out how often each one lands for this person and fold it in. Left out, the
 * three-year figure would have quietly become a two-and-a-half-year figure
 * that nothing tested.
 *
 * Each one is modelled from the profile rather than guessed:
 *
 * - **Clean sessions** fire at accuracy^batch, which at 85% over ten items is
 *   about one sitting in five, and at 75% about one in eighteen. That gap is
 *   the bonus working: it is for doing it well.
 * - **Burns** are the surprising one. In steady state a member burns about as
 *   many items a day as they start, six months behind, so an uncapped burn
 *   bonus would have been worth more than the routine day it garnishes. The
 *   cap is what makes it a garnish, and it binds for every profile here.
 * - **Streak milestones** only reach a seven-day-a-week learner at all, and
 *   the year one repeats, so a year is the period to amortise over.
 * - **JLPT bands** are earned on the curriculum ladder, not this one, so they
 *   are spread over the curriculum's own run to level 100 rather than over the
 *   XP run - the two take different lengths of time and only one of them is
 *   what pays these out.
 */
export function bonusXpPerActiveDay(profile: LearnerProfile): number {
  const batches = profile.reviewsPerDay / MODELLED_BATCH;
  const cleanOdds = profile.accuracy ** MODELLED_BATCH;
  const perCleanBatch = cleanSessionUnits(MODELLED_BATCH) * XP_BONUSES.cleanSession;
  const clean = Math.min(
    batches * cleanOdds * perCleanBatch,
    XP_DAILY_CAPS.cleanSession ?? Number.POSITIVE_INFINITY,
  );

  const burns = Math.min(
    profile.lessonsPerDay * XP_BONUSES.burnedItem,
    XP_DAILY_CAPS.burnedItem ?? Number.POSITIVE_INFINITY,
  );

  const streak = profile.daysPerWeek >= 7 ? STREAK_MILESTONE_TOTAL / DAYS_IN_YEAR : 0;

  const curriculumActiveDays =
    curriculumDaysToLevel(profile, KANJI_LADDER_LEVELS) * (profile.daysPerWeek / 7);
  const jlpt = curriculumActiveDays > 0 ? JLPT_BONUS_TOTAL / curriculumActiveDays : 0;

  return Math.round(clean + burns + streak + jlpt);
}

/** XP a profile earns on a day they show up, caps applied, bonuses included. */
export function xpPerActiveDay(profile: LearnerProfile, xpLevel = 1): number {
  return routineXpPerActiveDay(profile, xpLevel) + bonusXpPerActiveDay(profile);
}

/**
 * Days to a rank, simulated a day at a time rather than divided.
 *
 * Division was right until ranks began unlocking capacity. The moment a
 * reward feeds back into the rate that earns it, an average daily rate is the
 * wrong instrument: it priced the curve as a three-year climb that was really
 * a 2.6-year one, because it could not see the loop.
 */
export function xpDaysToRank(profile: LearnerProfile, rank = XP_RANKS): number {
  const target = xpForLevel(rank);
  const activeShare = profile.daysPerWeek / 7;
  let xp = 0;
  let level = 1;
  let days = 0;
  const ceiling = 40_000;
  while (xp < target && days < ceiling) {
    xp += xpPerActiveDay(profile, level) * activeShare;
    days += 1;
    while (level < XP_RANKS && xp >= xpForLevel(level + 1)) level += 1;
  }
  return days;
}

/**
 * Days to a curriculum level, which is a different question entirely.
 *
 * A level clears when 90% of its kanji reach Guru, and reaching Guru takes
 * four correct answers spread over roughly eight days — the SRS intervals, not
 * the member's appetite, set the floor. So the binding constraint is whichever
 * is slower: the time to *meet* a level's items at their lesson rate, or the
 * eight days the schedule needs to carry them to Guru, inflated by the
 * re-reviews a wrong answer costs.
 */
export function curriculumDaysToLevel(profile: LearnerProfile, level: number, itemsPerLevel = 40): number {
  const activeShare = profile.daysPerWeek / 7;
  const lessonDays = (itemsPerLevel * UK_LEVEL_UNLOCK_THRESHOLD) / (profile.lessonsPerDay * activeShare);
  /* A wrong answer sends an item back down, so low accuracy stretches the
     eight-day climb rather than adding lessons. */
  const guruDays = 8 / Math.max(0.4, profile.accuracy);
  return Math.round((Math.max(lessonDays, guruDays) * level) / 1);
}

export type PacingRow = {
  profile: LearnerProfile;
  /** At rank 1, before any capacity has been unlocked. */
  xpPerActiveDay: number;
  /** At the top, with every unlock. The gap is what a rank is worth. */
  xpPerActiveDayAtTop: number;
  /** Split out so a change to the bonus set is legible on its own. */
  routineXpPerActiveDay: number;
  bonusXpPerActiveDay: number;
  daysToRank100: number;
  yearsToRank100: number;
  daysToLevel10: number;
  daysToLevel100: number;
  yearsToLevel100: number;
};

export function pacingTable(profiles = LEARNER_PROFILES): PacingRow[] {
  return profiles.map((profile) => {
    const daysToRank100 = xpDaysToRank(profile);
    const daysToLevel100 = curriculumDaysToLevel(profile, KANJI_LADDER_LEVELS);
    return {
      profile,
      xpPerActiveDay: xpPerActiveDay(profile),
      xpPerActiveDayAtTop: xpPerActiveDay(profile, XP_RANKS),
      routineXpPerActiveDay: routineXpPerActiveDay(profile),
      bonusXpPerActiveDay: bonusXpPerActiveDay(profile),
      daysToRank100,
      yearsToRank100: Number((daysToRank100 / 365).toFixed(1)),
      daysToLevel10: curriculumDaysToLevel(profile, 10),
      daysToLevel100,
      yearsToLevel100: Number((daysToLevel100 / 365).toFixed(1)),
    };
  });
}
