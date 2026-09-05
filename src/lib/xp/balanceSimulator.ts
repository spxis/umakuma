import { KANJI_LADDER_LEVELS } from "@/lib/kanjiLadder";
import { UK_LEVEL_UNLOCK_THRESHOLD } from "@/lib/uk/ukLevel";

import { XP_AWARDS, XP_BONUSES } from "./xpAwards";
import { XP_RANKS, xpForLevel, xpLevelFor } from "./xpCurve";
import { gamesPerDayAt } from "./xpEntitlements";
import { restDaysAllowedAt } from "./xpRest";

/**
 * Ten people, a year, a day at a time.
 *
 * `learnerPacing.ts` answers "how long does this take" with arithmetic. This
 * answers a different question — what does a year actually *look like* — and
 * it has to be a simulation because almost everything here feeds back on
 * itself. A rank unlocks games, which earn XP, which raises the rank. Accuracy
 * decides how fast items reach Guru, which decides when a level clears, which
 * decides how many lessons are available to earn from. None of that survives
 * being averaged.
 *
 * The point is to be able to change a number and see who it hurts. A curve
 * tuned only for the person in the middle quietly tells the other nine it was
 * not built for them, and that is invisible until somebody is simulated.
 *
 * It is a model and it is wrong in the ways models are: no illness beyond the
 * missed days each persona is given, no motivation curve, no life. It is for
 * comparing a change against no change, not for predicting anybody.
 */

export type SimPersona = {
  id: string;
  label: string;
  /** Chance of studying on any given day, 0-1. */
  attendance: number;
  /** Reviews attempted on a day they study. */
  reviewsPerDay: number;
  /** New items started on a day they study. */
  lessonsPerDay: number;
  gamesPerDay: number;
  /** Share answered correctly. Drives both ladders, hard. */
  accuracy: number;
  /**
   * Sittings in a day, and the hours they happen at.
   *
   * This matters more than almost anything else here and is the easiest thing
   * to leave out. Stage 1 comes back in four hours and stage 2 in eight, so
   * somebody who opens the site once a day can carry an item **one** stage in
   * that day however long they sit there — the next review simply is not due.
   * Somebody who looks in morning and evening carries it two or three. Over
   * the early levels, where every item is on those short intervals, that is
   * the difference between a fortnight and a month, and no amount of
   * enthusiasm closes it.
   */
  sessionHours: number[];
  /** Whether they sit a level test when one is offered. */
  sitsExams: boolean;
  /** A single holiday in the year, in days. */
  holidayDays: number;
};

export const SIM_PERSONAS: SimPersona[] = [
  { id: "devoted", label: "Devoted, every day, sharp", attendance: 1, reviewsPerDay: 100, lessonsPerDay: 15, gamesPerDay: 3, accuracy: 0.92, sessionHours: [8, 13, 21], sitsExams: true, holidayDays: 0 },
  { id: "ambitious", label: "Ambitious, pushes hard, makes mistakes", attendance: 0.95, reviewsPerDay: 140, lessonsPerDay: 25, gamesPerDay: 3, accuracy: 0.72, sessionHours: [7, 12, 18, 22], sitsExams: true, holidayDays: 7 },
  { id: "daily-sharp", label: "Daily, modest sessions, very quick", attendance: 0.95, reviewsPerDay: 45, lessonsPerDay: 10, gamesPerDay: 2, accuracy: 0.94, sessionHours: [8, 20], sitsExams: true, holidayDays: 14 },
  { id: "daily-steady", label: "Daily, modest sessions, average", attendance: 0.9, reviewsPerDay: 45, lessonsPerDay: 10, gamesPerDay: 2, accuracy: 0.82, sessionHours: [8, 20], sitsExams: true, holidayDays: 14 },
  { id: "daily-struggling", label: "Daily, works hard, finds it hard", attendance: 0.9, reviewsPerDay: 45, lessonsPerDay: 6, gamesPerDay: 2, accuracy: 0.65, sessionHours: [19], sitsExams: true, holidayDays: 14 },
  { id: "commuter", label: "Weekdays only, short bursts", attendance: 0.71, reviewsPerDay: 25, lessonsPerDay: 5, gamesPerDay: 1, accuracy: 0.8, sessionHours: [8, 18], sitsExams: false, holidayDays: 21 },
  { id: "weekend", label: "Weekends only, long sittings", attendance: 0.29, reviewsPerDay: 120, lessonsPerDay: 20, gamesPerDay: 3, accuracy: 0.78, sessionHours: [10, 15, 20], sitsExams: true, holidayDays: 14 },
  { id: "gamer", label: "Here for the games, reviews little", attendance: 0.85, reviewsPerDay: 10, lessonsPerDay: 2, gamesPerDay: 4, accuracy: 0.7, sessionHours: [21], sitsExams: false, holidayDays: 7 },
  { id: "dabbler", label: "On and off, a few days a month", attendance: 0.2, reviewsPerDay: 30, lessonsPerDay: 5, gamesPerDay: 1, accuracy: 0.75, sessionHours: [20], sitsExams: false, holidayDays: 30 },
  { id: "returner", label: "Keen, then away for months, then back", attendance: 0.55, reviewsPerDay: 60, lessonsPerDay: 12, gamesPerDay: 2, accuracy: 0.8, sessionHours: [8, 21], sitsExams: true, holidayDays: 60 },
];

export type SimResult = {
  persona: SimPersona;
  daysStudied: number;
  /** Answers given wrong. The cost of low accuracy, made countable. */
  wrongAnswers: number;
  /** Share of all answers that were wrong. */
  wrongShare: number;
  lessonsStarted: number;
  gamesPlayed: number;
  /** XP by where it came from, so a table can show what somebody is here for. */
  xpFromReviews: number;
  xpFromLessons: number;
  xpFromGames: number;
  xpFromBonuses: number;
  /** Items still short of Guru at the end — the queue they are carrying. */
  itemsInFlight: number;
  xp: number;
  xpRank: number;
  rankName?: string;
  curriculumLevel: number;
  itemsLearned: number;
  itemsAtGuru: number;
  reviewsAnswered: number;
  longestStreak: number;
  restDaysSpent: number;
  restDaysAllowed: number;
  /** True when the holiday cost them the streak because the allowance ran out. */
  streakSurvivedHoliday: boolean;
  examsSat: number;
};

/**
 * What a level actually teaches, counted from the shipped ladder rather than
 * guessed: 9,271 items over a hundred levels, of which 2,235 are kanji.
 *
 * The first version used 40 and it halved the work. That is how the devoted
 * learner came out finishing the whole curriculum inside a year — a result
 * absurd enough to be obvious, which is the only reason it was caught. A model
 * wrong by a factor of two in a less visible place would have been believed.
 */
const ITEMS_PER_LEVEL = 93;
const KANJI_PER_LEVEL = 22;
/** Guru is stage 5. */
const GURU_STAGE = 5;

/**
 * Hours until an item at each stage comes back, from `srsSchedule.ts`.
 *
 * Modelling these rather than counting repetitions is the difference between
 * a simulator and a toy. Without them the first run had the devoted learner
 * finishing all hundred levels in a year, because nothing stopped them
 * reviewing the same item forty times in an afternoon. The schedule, not
 * appetite, is what sets the floor: four hours, eight, twenty-three,
 * forty-seven — about three and a half days to Guru at the very fastest, and
 * only if every answer is right and every review is done the minute it lands.
 */
const STAGE_HOURS = [0, 4, 8, 23, 47, 168, 336, 720, 2880, 0];

/** Where a wrong answer sends an item, from `srsSchedule.ts` verbatim. */
const DEMOTION_MAP: Record<number, number> = { 0: 0, 1: 1, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7, 9: 8 };

type SimOptions = { days?: number; seed?: number };

/** A small deterministic generator, so a run is reproducible and comparable. */
function makeRandom(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return state / 4_294_967_296;
  };
}

/**
 * Runs one persona.
 *
 * The curriculum side is modelled as a pool of items in flight: a lesson puts
 * one in, a correct review advances it, four correct answers carry it to Guru,
 * and a level clears at 90% of its kanji. A wrong answer sends an item back a
 * step, which is what makes accuracy compound — the struggling learner does
 * not simply go slower, they go slower at everything downstream.
 */
export function simulatePersona(persona: SimPersona, options: SimOptions = {}): SimResult {
  const days = options.days ?? 365;
  const random = makeRandom(options.seed ?? 12_345);

  let xp = 0;
  let xpRank = 1;
  let curriculumLevel = 1;
  let itemsLearned = 0;
  let reviewsAnswered = 0;
  let examsSat = 0;
  let restDaysSpent = 0;
  let wrongAnswers = 0;
  let lessonsStarted = 0;
  let gamesPlayed = 0;
  let xpFromReviews = 0;
  let xpFromLessons = 0;
  let xpFromGames = 0;
  let xpFromBonuses = 0;
  let streak = 0;
  let longestStreak = 0;
  let streakSurvivedHoliday = true;

  /**
   * Items in flight: the stage each sits at, when it next comes due, and
   * whether it is a kanji.
   *
   * Marked at creation rather than counted as a fraction afterwards. The first
   * version multiplied each day's carried items by the kanji share and rounded
   * — so a day that carried two items scored `round(0.47)` = zero, and a
   * year's progress rounded away to nothing. Every persona finished at level 1
   * with an empty queue, which is the kind of result that looks like a finding
   * and is actually a bug.
   */
  let inFlight: { stage: number; dueHour: number; isKanji: boolean }[] = [];
  let kanjiAtGuru = 0;

  const holidayStart = persona.holidayDays > 0 ? Math.floor(days / 2) : -1;
  const holidayEnd = holidayStart + persona.holidayDays;

  for (let day = 0; day < days; day += 1) {
    const onHoliday = day >= holidayStart && day < holidayEnd;
    const studied = !onHoliday && random() < persona.attendance;

    if (!studied) {
      const allowance = restDaysAllowedAt(xpRank);
      if (restDaysSpent < allowance) {
        restDaysSpent += 1;
      } else {
        if (onHoliday) streakSurvivedHoliday = false;
        streak = 0;
      }
      continue;
    }

    streak += 1;
    if (streak > longestStreak) longestStreak = streak;

    const dayStart = day * 24;

    /* Lessons are bounded by what the level still has to teach. */
    const room = Math.max(0, curriculumLevel * ITEMS_PER_LEVEL - itemsLearned);
    const lessons = Math.min(persona.lessonsPerDay, room);
    for (let at = 0; at < lessons; at += 1) {
      inFlight.push({
        stage: 1,
        dueHour: dayStart + persona.sessionHours[0] + STAGE_HOURS[1],
        /* Deterministic rather than random, so the share is exact over a level
           rather than approximately right on average. */
        isKanji: (itemsLearned + at) % Math.round(ITEMS_PER_LEVEL / KANJI_PER_LEVEL) === 0,
      });
    }
    itemsLearned += lessons;
    lessonsStarted += lessons;

    /* One pass per sitting, and only what is due *at that hour*. This is the
       whole reason sessions are modelled: a review that comes due at 2pm is
       unavailable to somebody who only ever looks in at 8am, and is caught the
       same day by somebody who looks again at 9pm. */
    /* One budget for the day, spent across the sittings rather than split
       between them. Splitting it rigidly made *more* sittings score worse:
       capacity unused at breakfast, because little was due yet, was simply
       thrown away instead of being available at bedtime. That inverted the
       very effect this models. */
    let budget = persona.reviewsPerDay;
    let reviews = 0;
    let correct = 0;
    for (const sessionHour of persona.sessionHours) {
      if (budget <= 0) break;
      const now = dayStart + sessionHour;
      const due = inFlight.filter((item) => item.dueHour <= now);
      const take = Math.min(budget, due.length);
      budget -= take;
      for (let at = 0; at < take; at += 1) {
        const item = due[at];
        if (random() < persona.accuracy) {
          correct += 1;
          item.stage = Math.min(9, item.stage + 1);
        } else {
          /* The real demotion map from `srsSchedule.ts`, not an approximation.
             A wrong answer drops the item a stage and it must climb back
             through every interval again, so one mistake is not one lost
             review — it is that review plus every repetition it undoes. This
             is why accuracy compounds: the struggling learner is slower at
             everything downstream of the item they keep missing, and their
             queue grows while it happens. */
          item.stage = DEMOTION_MAP[item.stage] ?? 1;
          wrongAnswers += 1;
        }
        item.dueHour = now + STAGE_HOURS[item.stage];
      }
      reviews += take;
    }
    reviewsAnswered += reviews;

    /* Only kanji gate a level, so only kanji are counted. */
    kanjiAtGuru += inFlight.filter((item) => item.stage >= GURU_STAGE && item.isKanji).length;
    inFlight = inFlight.filter((item) => item.stage < GURU_STAGE);

    /* A level clears at 90% of its kanji at Guru, the same rule the real
       ladder uses. Several levels can clear in one day for somebody who has
       been carrying a large queue, which is why this is a loop. */
    while (
      curriculumLevel < KANJI_LADDER_LEVELS &&
      kanjiAtGuru >= curriculumLevel * KANJI_PER_LEVEL * UK_LEVEL_UNLOCK_THRESHOLD
    ) {
      curriculumLevel += 1;
      xp += XP_AWARDS.curriculumLevelGained;
      if (persona.sitsExams) {
        examsSat += 1;
        xp += XP_AWARDS.levelTestWritten;
        if (persona.accuracy > 0.7) xp += XP_AWARDS.levelTestPassed;
      }
    }

    const games = Math.min(persona.gamesPerDay, gamesPerDayAt(xpRank));
    gamesPlayed += games;

    const reviewXp = reviews * XP_AWARDS.reviewAnswered + correct * XP_AWARDS.reviewCorrect;
    const lessonXp = lessons * XP_AWARDS.lessonLearned;
    const gameXp = games * XP_AWARDS.gameFinished;
    let bonusXp = 0;
    if (streak > 0 && streak % 7 === 0) bonusXp += XP_AWARDS.weeklyStreak;
    if (streak === 7) bonusXp += XP_BONUSES.sevenDayStreak;
    if (streak === 30) bonusXp += XP_BONUSES.thirtyDayStreak;
    if (streak === 100) bonusXp += XP_BONUSES.hundredDayStreak;
    if (streak === 365) bonusXp += XP_BONUSES.yearLongStreak;

    xpFromReviews += reviewXp;
    xpFromLessons += lessonXp;
    xpFromGames += gameXp;
    xpFromBonuses += bonusXp;
    xp += XP_AWARDS.dailySignIn + reviewXp + lessonXp + gameXp + bonusXp;

    xpRank = xpLevelFor(xp);
  }

  return {
    persona,
    daysStudied: reviewsAnswered === 0 ? 0 : Math.round(longestStreak),
    xp,
    xpRank,
    curriculumLevel,
    itemsLearned,
    itemsAtGuru: kanjiAtGuru,
    reviewsAnswered,
    wrongAnswers,
    wrongShare: reviewsAnswered === 0 ? 0 : wrongAnswers / reviewsAnswered,
    lessonsStarted,
    gamesPlayed,
    xpFromReviews,
    xpFromLessons,
    xpFromGames,
    xpFromBonuses,
    itemsInFlight: inFlight.length,
    longestStreak,
    restDaysSpent,
    restDaysAllowed: restDaysAllowedAt(xpRank),
    streakSurvivedHoliday,
    examsSat,
  };
}

export function runBalanceSimulation(options: SimOptions = {}): SimResult[] {
  return SIM_PERSONAS.map((persona, index) =>
    simulatePersona(persona, { ...options, seed: (options.seed ?? 12_345) + index }),
  );
}

/** How far up each ladder a result stands, for reading two systems together. */
export function simulationSummary(results: SimResult[]): {
  xpRankRange: [number, number];
  curriculumRange: [number, number];
  nobodyStalled: boolean;
  everyoneMoved: boolean;
} {
  const ranks = results.map((row) => row.xpRank);
  const levels = results.map((row) => row.curriculumLevel);
  return {
    xpRankRange: [Math.min(...ranks), Math.max(...ranks)],
    curriculumRange: [Math.min(...levels), Math.max(...levels)],
    /* Nobody should finish a year of genuine use still on rank 1. */
    nobodyStalled: results.every((row) => row.reviewsAnswered === 0 || row.xpRank > 1),
    everyoneMoved: results.every((row) => row.reviewsAnswered === 0 || row.curriculumLevel > 1),
  };
}

export { XP_RANKS, xpForLevel };
