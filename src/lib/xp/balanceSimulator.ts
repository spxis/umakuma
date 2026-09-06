import { KANJI_LADDER_LEVELS } from "@/lib/kanjiLadder";

import { addSplit, EMPTY_SPLIT, SIM_BATCH_SIZE, simDayXp, splitTotal } from "./simEconomy";
import { curriculumItemAt, itemsThroughLevel, levelClears, levelShape } from "./simCurriculum";
import {
  SimDueQueue,
  SRS_BURNED_STAGE,
  SRS_DEMOTION,
  SRS_FIRST_STAGE,
  SRS_GURU_STAGE,
  SRS_STAGE_HOURS,
  expectedReviews,
} from "./simSchedule";
import type { SimItem, SimOptions, SimOverrides, SimPersona, SimResult, SimXpSplit } from "./simTypes";
import { xpLevelFor, XP_RANKS } from "./xpCurve";
import { gamesPerDayAt } from "./xpEntitlements";
import { xpRankName } from "./xpRanks";
import { restDaysAllowedAt } from "./xpRest";

/**
 * A person, a day at a time, for as long as you ask.
 *
 * The point is to be able to change a number and see who it hurts. Almost
 * everything here feeds back on itself — a rank unlocks games, which earn XP,
 * which raises the rank; accuracy decides how fast items reach Guru, which
 * decides when a level clears, which decides how much there is to learn — and
 * none of that survives being averaged. This replaced a closed-form model that
 * divided work by rate and could not see any of it.
 *
 * Four things it now gets right that a simulator has to:
 *
 * 1. **Guru is not the end.** An item goes on to 1 week, 2 weeks, 1 month and
 *    4 months before it burns, and every one of those is a review that costs
 *    the same budget as a new one. Deleting items at Guru halved the standing
 *    review load and had a forty-five-review-a-day learner finishing all nine
 *    thousand items inside three years.
 * 2. **The queue is served most overdue first**, which is what a real queue
 *    does. Served in learn order, a third sitting spends its budget
 *    re-answering four-hour items while a week-old backlog waits, and more
 *    sittings scored *worse* — an inversion belonging to the model, not the
 *    schedule.
 * 3. **The curriculum is the shipped one**, level by level: fifteen radicals
 *    and no kanji at level 1, seven kanji at level 2. The early gates are tiny
 *    and that is exactly where session timing decides anything.
 * 4. **Level progress is a high-water mark.** `resolveUnLevel` counts an item
 *    that has *ever* reached Guru, so a demotion does not un-clear a level.
 *
 * It is still a model and wrong in the ways models are: no motivation curve,
 * no illness beyond the days each persona is given, no leeches, and an import
 * modelled as knowledge already burned. It is for comparing a change against
 * no change, not for predicting anybody.
 */

/** A small deterministic generator, so a run is reproducible and comparable. */
function makeRandom(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return state / 4_294_967_296;
  };
}

export function applyOverrides(persona: SimPersona, overrides?: SimOverrides): SimPersona {
  if (!overrides) return persona;
  const merged = { ...persona, ...overrides };
  return {
    ...merged,
    sessionHours: [...merged.sessionHours].sort((first, second) => first - second),
  };
}

/** Rest days spent inside the trailing year, which is the allowance's period. */
function restDaysInYear(spentOn: number[], today: number): number {
  let count = 0;
  for (let at = spentOn.length - 1; at >= 0; at -= 1) {
    if (today - spentOn[at] >= 365) break;
    count += 1;
  }
  return count;
}

type LevelState = { level: number; passedByLevel: Uint16Array };

function advanceLevels(state: LevelState): number {
  let gained = 0;
  while (state.level < KANJI_LADDER_LEVELS && levelClears(state.level, state.passedByLevel[state.level])) {
    state.level += 1;
    gained += 1;
  }
  return gained;
}

export function simulatePersona(input: SimPersona, options: SimOptions = {}): SimResult {
  const persona = input;
  const days = Math.max(1, Math.trunc(options.days ?? 365));
  const random = makeRandom(options.seed ?? 12_345);
  const lessonGate = options.lessonGate ?? null;
  const throttleOnBacklog = options.throttleLessonsOnBacklog ?? false;
  const sessionHours = persona.sessionHours.length > 0 ? persona.sessionHours : [20];

  const queue = new SimDueQueue(days * 24 + 24);
  const level: LevelState = { level: Math.max(1, persona.startLevel), passedByLevel: new Uint16Array(KANJI_LADDER_LEVELS + 2) };

  /* Everything below the starting level is treated as known and burned: an
     import arrives with the gates behind it already cleared and does not owe
     the review load of levels it never sat here. Optimistic on their queue,
     honest about their standing, and the only assumption that keeps the import
     question about XP rather than about somebody else's SRS history. */
  for (let below = 1; below < level.level; below += 1) {
    level.passedByLevel[below] = levelShape(below)?.gateNeed ?? 0;
  }
  let itemsLearned = itemsThroughLevel(level.level - 1);
  let itemsBurned = itemsLearned;
  let itemsPassed = itemsLearned;
  let apprentice = 0;

  let xp = Math.max(0, persona.startXp);
  let xpRank = xpLevelFor(xp);
  const split: SimXpSplit = { ...EMPTY_SPLIT };

  let daysStudied = 0;
  let reviewsAnswered = 0;
  let wrongAnswers = 0;
  let lessonsStarted = 0;
  let gamesPlayed = 0;
  let examsSat = 0;
  let streak = 0;
  let longestStreak = 0;
  let streakSurvivedHoliday = true;
  const restDayLog: number[] = [];
  const levelDays: (number | null)[] = new Array(KANJI_LADDER_LEVELS + 1).fill(null);
  const levelXp: (number | null)[] = new Array(KANJI_LADDER_LEVELS + 1).fill(null);
  for (let reached = 1; reached <= level.level; reached += 1) {
    levelDays[reached] = 0;
    levelXp[reached] = xp;
  }
  let dayReachedRank100: number | null = xpRank >= XP_RANKS ? 0 : null;

  const holidayStart = persona.holidayDays > 0 ? Math.floor(days / 2) : -1;
  const holidayEnd = holidayStart + persona.holidayDays;

  for (let day = 0; day < days; day += 1) {
    const onHoliday = day >= holidayStart && day < holidayEnd;
    if (onHoliday || random() >= persona.attendance) {
      if (restDaysInYear(restDayLog, day) < restDaysAllowedAt(xpRank)) {
        restDayLog.push(day);
      } else {
        if (onHoliday) streakSurvivedHoliday = false;
        streak = 0;
      }
      continue;
    }

    daysStudied += 1;
    streak += 1;
    if (streak > longestStreak) longestStreak = streak;
    const dayStart = day * 24;
    const levelBefore = level.level;

    /* Lessons are bounded by what the levels behind them still have to teach,
       and optionally by how deep the apprentice queue already is or by whether
       the day opens behind. The level gate is the one that is always on, and
       it is load-bearing: a member cannot start material from levels they have
       not unlocked, so the curriculum throttles its own lesson rate to
       whatever they can carry to Guru. Take that away — a large import, an
       unlocked level with a lot behind it — and insolvency is possible. */
    let room = itemsThroughLevel(level.level) - itemsLearned;
    if (lessonGate !== null) room = Math.min(room, lessonGate - apprentice);
    if (throttleOnBacklog && queue.countDueBy(dayStart + sessionHours[0]) >= persona.reviewsPerDay) room = 0;
    const lessons = Math.max(0, Math.min(persona.lessonsPerDay, room));
    for (let made = 0; made < lessons; made += 1) {
      const taught = curriculumItemAt(itemsLearned + made);
      if (!taught) break;
      const item: SimItem = { stage: SRS_FIRST_STAGE, kind: taught.kind, level: taught.level, passed: false };
      queue.schedule(item, dayStart + sessionHours[0] + SRS_STAGE_HOURS[SRS_FIRST_STAGE]);
      apprentice += 1;
    }
    itemsLearned += lessons;
    lessonsStarted += lessons;

    /* One budget for the day, spent across the sittings rather than divided
       between them. Splitting it rigidly made *more* sittings score worse:
       capacity unused at breakfast, because little was due yet, was thrown
       away instead of being available at bedtime. */
    let budget = persona.reviewsPerDay;
    let reviews = 0;
    let correct = 0;
    let burns = 0;
    let batchSeen = 0;
    let batchWrong = 0;
    let cleanBatches = 0;

    for (const hour of sessionHours) {
      if (budget <= 0) break;
      const now = dayStart + hour;
      const items = queue.take(now, budget);
      budget -= items.length;
      reviews += items.length;
      for (const item of items) {
        const wasApprentice = item.stage < SRS_GURU_STAGE;
        if (random() < persona.accuracy) {
          correct += 1;
          item.stage += 1;
        } else {
          /* A wrong answer is not one lost review: the item drops a stage and
             must climb every interval again, so the cost is that review plus
             every repetition it undoes. This is why accuracy compounds. */
          item.stage = SRS_DEMOTION[item.stage] ?? SRS_FIRST_STAGE;
          wrongAnswers += 1;
          batchWrong += 1;
        }
        if (!item.passed && item.stage >= SRS_GURU_STAGE) {
          item.passed = true;
          itemsPassed += 1;
          if (item.kind === levelShape(item.level)?.gateKind) level.passedByLevel[item.level] += 1;
        }
        const nowApprentice = item.stage < SRS_GURU_STAGE;
        if (wasApprentice && !nowApprentice) apprentice -= 1;
        if (!wasApprentice && nowApprentice) apprentice += 1;

        if (item.stage >= SRS_BURNED_STAGE) {
          itemsBurned += 1;
          burns += 1;
        } else {
          queue.schedule(item, now + SRS_STAGE_HOURS[item.stage]);
        }

        batchSeen += 1;
        if (batchSeen >= SIM_BATCH_SIZE) {
          if (batchWrong === 0) cleanBatches += 1;
          batchSeen = 0;
          batchWrong = 0;
        }
      }
    }
    reviewsAnswered += reviews;

    const levelsGained = advanceLevels(level);
    if (persona.sitsExams) examsSat += levelsGained;

    const games = Math.min(persona.gamesPerDay, gamesPerDayAt(xpRank));
    gamesPlayed += games;

    const earned = simDayXp({
      reviews,
      correct,
      lessons,
      games,
      cleanBatches,
      burns,
      streak,
      levelsGained,
      levelBefore,
      levelAfter: level.level,
      sitsExams: persona.sitsExams,
      /* A level test is a run of answers at their own accuracy; below seven in
         ten they do not reliably pass one. */
      passesExams: persona.accuracy > 0.7,
    });
    addSplit(split, earned);
    xp += splitTotal(earned);
    for (let reached = levelBefore + 1; reached <= level.level; reached += 1) {
      levelDays[reached] = day;
      levelXp[reached] = xp;
    }
    xpRank = xpLevelFor(xp);
    if (xpRank >= XP_RANKS && dayReachedRank100 === null) dayReachedRank100 = day;
  }

  return {
    persona,
    days,
    daysStudied,
    reviewsAnswered,
    wrongAnswers,
    wrongShare: reviewsAnswered === 0 ? 0 : wrongAnswers / reviewsAnswered,
    lessonsStarted,
    gamesPlayed,
    xp,
    xpRank,
    rankName: xpRankName(xpRank),
    xpSplit: split,
    curriculumLevel: level.level,
    itemsLearned,
    itemsPassed,
    itemsBurned,
    itemsInFlight: queue.inFlight,
    backlog: queue.waiting,
    /* Realized rather than intended: what the lessons they actually started
       will eventually demand, against the reviews they actually did. */
    reviewLoadRatio:
      reviewsAnswered === 0
        ? 0
        : (lessonsStarted * expectedReviews(persona.accuracy)) / reviewsAnswered,
    longestStreak,
    restDaysSpent: restDayLog.length,
    restDaysAllowed: restDaysAllowedAt(xpRank),
    streakSurvivedHoliday,
    examsSat,
    levelDays,
    levelXp,
    dayReachedRank100,
  };
}

/** Every persona over the same horizon, each with its own stream of luck. */
export function runBalanceSimulation(personas: readonly SimPersona[], options: SimOptions = {}): SimResult[] {
  return personas.map((persona, index) =>
    simulatePersona(persona, { ...options, seed: (options.seed ?? 12_345) + index }),
  );
}

/**
 * The same person, sitting down a different number of times a day.
 *
 * The one comparison the whole simulator was built to make, and the only
 * honest way to make it: everything else held fixed, the sittings spread
 * evenly across a waking day, one seed. Anything that comes out of this is a
 * property of the schedule and the budget, because nothing else moved.
 */
export function sittingsComparison(
  persona: SimPersona,
  options: SimOptions = {},
  sittings: readonly number[] = [1, 2, 3, 4],
): SimResult[] {
  return sittings.map((count) => {
    const hours = Array.from({ length: count }, (unused, index) =>
      Math.round(8 + (index * 14) / Math.max(1, count - 1)),
    );
    return simulatePersona(
      { ...persona, id: `${persona.id}-x${count}`, label: `${count}× a day`, sessionHours: count === 1 ? [20] : hours },
      options,
    );
  });
}
