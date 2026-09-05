import type { SimResult } from "./simTypes";

/**
 * One person, one row.
 *
 * A `SimResult` carries a hundred-entry level trace and the whole persona; a
 * table wants neither over the wire. This is the shape the admin screen reads,
 * and building it field by field rather than spreading the result is the same
 * rule `toGameRunSummary` follows: a spread ships whatever the engine happens
 * to be carrying that week.
 */

export type SimTableRow = {
  id: string;
  label: string;
  story: string;
  /** The settings the row was actually run with, overrides applied. */
  attendance: number;
  reviewsPerDay: number;
  lessonsPerDay: number;
  gamesPerDay: number;
  accuracy: number;
  sittings: number;
  sessionHours: number[];
  startLevel: number;

  xp: number;
  xpRank: number;
  rankName: string;
  curriculumLevel: number;
  daysStudied: number;
  reviewsAnswered: number;
  wrongAnswers: number;
  wrongShare: number;
  lessonsStarted: number;
  gamesPlayed: number;
  xpFromReviews: number;
  xpFromLessons: number;
  xpFromGames: number;
  xpFromLevels: number;
  xpFromStreaks: number;
  xpFromQuality: number;
  itemsLearned: number;
  itemsPassed: number;
  itemsBurned: number;
  itemsInFlight: number;
  backlog: number;
  reviewLoadRatio: number;
  longestStreak: number;
  restDaysSpent: number;
  restDaysAllowed: number;
  streakSurvivedHoliday: boolean;
  examsSat: number;
  daysToLevel10: number | null;
  daysToLevel25: number | null;
  daysToLevel50: number | null;
  daysToRank100: number | null;
};

export function toSimTableRow(result: SimResult): SimTableRow {
  const { persona, xpSplit } = result;
  return {
    id: persona.id,
    label: persona.label,
    story: persona.story,
    attendance: persona.attendance,
    reviewsPerDay: persona.reviewsPerDay,
    lessonsPerDay: persona.lessonsPerDay,
    gamesPerDay: persona.gamesPerDay,
    accuracy: persona.accuracy,
    sittings: persona.sessionHours.length,
    sessionHours: persona.sessionHours,
    startLevel: persona.startLevel,

    xp: result.xp,
    xpRank: result.xpRank,
    rankName: result.rankName,
    curriculumLevel: result.curriculumLevel,
    daysStudied: result.daysStudied,
    reviewsAnswered: result.reviewsAnswered,
    wrongAnswers: result.wrongAnswers,
    wrongShare: result.wrongShare,
    lessonsStarted: result.lessonsStarted,
    gamesPlayed: result.gamesPlayed,
    xpFromReviews: xpSplit.reviews,
    xpFromLessons: xpSplit.lessons,
    xpFromGames: xpSplit.games,
    xpFromLevels: xpSplit.levels,
    xpFromStreaks: xpSplit.streaks,
    xpFromQuality: xpSplit.quality,
    itemsLearned: result.itemsLearned,
    itemsPassed: result.itemsPassed,
    itemsBurned: result.itemsBurned,
    itemsInFlight: result.itemsInFlight,
    backlog: result.backlog,
    reviewLoadRatio: result.reviewLoadRatio,
    longestStreak: result.longestStreak,
    restDaysSpent: result.restDaysSpent,
    restDaysAllowed: result.restDaysAllowed,
    streakSurvivedHoliday: result.streakSurvivedHoliday,
    examsSat: result.examsSat,
    daysToLevel10: result.levelDays[10] ?? null,
    daysToLevel25: result.levelDays[25] ?? null,
    daysToLevel50: result.levelDays[50] ?? null,
    daysToRank100: result.dayReachedRank100,
  };
}
