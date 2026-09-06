import { GAME_CHOICE_COUNTS, type GameChoiceCount } from "@/lib/gameBoard";
import {
  GAME_BATCH_SIZES,
  GAME_KINDS,
  GAME_PRACTICE_LISTS,
  GAME_TIME_LIMITS_MS,
  type GameCategory,
  type GameDirection,
} from "@/lib/gameMode";
import type { RandomSource } from "@/lib/gameRandom";
import { GAME_LADDERS, type GameRunRequest } from "@/lib/gameRunCreate";
import { accumulateItemScore } from "@/lib/gameScoring";

import type { CohortPersona } from "./cohortPersona";

/**
 * A simulated member playing.
 *
 * The questions come from the site's own planner - `planGameRun` builds them
 * with the same pool, the same distractors and the same balancing a real
 * round gets - and this only decides which tile the member taps and how long
 * they took. The score is then the site's, through the same functions the
 * answer route uses. Scores are played, not invented: a number typed into
 * `GameRun.score` would prove nothing about the scoreboard.
 */

export type PlannedQuestion = {
  position: number;
  targetSubjectId: number;
  optionSubjectIds: number[];
  leftSubjectId: number;
  middleSubjectId: number | null;
  rightSubjectId: number;
};

export type PlayedAnswer = {
  position: number;
  selectedSubjectId: number;
  correct: boolean;
  answeredAt: Date;
};

export type PlayedRun = {
  answers: PlayedAnswer[];
  answeredCount: number;
  correctCount: number;
  bestStreak: number;
  /** The running total a timed game keeps; zero for the rest. */
  accumulatedScore: number;
  completedAt: Date;
};

function pick<T>(items: readonly T[], random: RandomSource): T {
  return items[Math.floor(random() * items.length)]!;
}

/** Roughly log-normal around the member's median, and slower when unsure. */
function responseMs(persona: CohortPersona, correct: boolean, random: RandomSource): number {
  const gaussian = (random() + random() + random() + random() - 2) * 0.9;
  const base = persona.gameSpeedMs * Math.exp(gaussian * 0.45);
  return Math.round(Math.max(500, base * (correct ? 1 : 1.4)));
}

/**
 * Plays a planned round. A timed round stops when the clock runs out, on the
 * answer that lands after it, the way the answer route closes one.
 */
export function playRun({
  persona,
  questions,
  choiceCount,
  timeLimitMs,
  startedAt,
  random,
}: {
  persona: CohortPersona;
  questions: readonly PlannedQuestion[];
  choiceCount: number;
  timeLimitMs: number | null;
  startedAt: Date;
  random: RandomSource;
}): PlayedRun {
  const accuracy = Math.min(0.99, Math.max(0.3, persona.gameAccuracy - 0.06 * (choiceCount - 2)));
  const answers: PlayedAnswer[] = [];
  let clock = startedAt.getTime();
  let correctCount = 0;
  let streak = 0;
  let bestStreak = 0;
  let accumulated = 0;

  for (const question of [...questions].sort((a, b) => a.position - b.position)) {
    const options = question.optionSubjectIds.length > 0
      ? question.optionSubjectIds
      : [question.leftSubjectId, question.middleSubjectId, question.rightSubjectId].filter((id): id is number => id !== null);
    const wrong = options.filter((id) => id !== question.targetSubjectId);
    const correct = wrong.length === 0 || random() < accuracy;
    const elapsed = responseMs(persona, correct, random);
    clock += elapsed;

    const expired = timeLimitMs !== null && clock - startedAt.getTime() > timeLimitMs;
    if (expired) break;

    answers.push({
      position: question.position,
      selectedSubjectId: correct ? question.targetSubjectId : pick(wrong, random),
      correct,
      answeredAt: new Date(clock),
    });
    if (correct) {
      correctCount += 1;
      streak += 1;
      bestStreak = Math.max(bestStreak, streak);
    } else {
      streak = 0;
    }
    if (timeLimitMs !== null) accumulated = accumulateItemScore(accumulated, correct, elapsed);
  }

  const completedAt = timeLimitMs !== null ? new Date(startedAt.getTime() + timeLimitMs) : new Date(clock);
  return { answers, answeredCount: answers.length, correctCount, bestStreak, accumulatedScore: accumulated, completedAt };
}

/** How many games this member plays today: usually none or one, sometimes a few. */
export function gamesToday(persona: CohortPersona, random: RandomSource): number {
  let count = 0;
  let chance = Math.min(0.95, persona.gamesPerDay / (1 + persona.gamesPerDay));
  while (random() < chance && count < 4) {
    count += 1;
    chance *= 0.6;
  }
  return count;
}

function chooseChoiceCount(persona: CohortPersona, random: RandomSource): GameChoiceCount {
  const roll = random() * 0.6 + persona.hardness * 0.4;
  if (roll < 0.4) return GAME_CHOICE_COUNTS[0];
  if (roll < 0.75) return GAME_CHOICE_COUNTS[1];
  return GAME_CHOICE_COUNTS[2];
}

/**
 * Which game, and how it is set up.
 *
 * Match on our own ladder is the usual choice; the map is the one everybody
 * plays a bit; Time Attack now and then; the Daily Challenge only on the day
 * it is for, once, and never in a replayed past, since its questions are
 * whatever the first player of that day was dealt.
 */
export function chooseGame({
  persona,
  level,
  dailyAvailable,
  random,
}: {
  persona: CohortPersona;
  level: number;
  dailyAvailable: boolean;
  random: RandomSource;
}): GameRunRequest {
  const choiceCount = chooseChoiceCount(persona, random);
  const direction: GameDirection = random() < 0.7 ? "find" : "read";
  const category: GameCategory = pick(["mixed", "mixed", "kanji", "kanji", "vocabulary", "radical"] as const, random);
  /* The level they play at: usually one they have reached, sometimes all of them. */
  const playedLevel = random() < 0.2 ? null : Math.max(1, Math.min(level, 1 + Math.floor(random() * level)));

  const base = {
    batchSize: pick(GAME_BATCH_SIZES.slice(0, 4), random) as number,
    level: playedLevel,
    category,
    choiceCount,
    direction,
    answerMode: "auto" as const,
    practiceList: GAME_PRACTICE_LISTS.toughest,
    ultraMode: false,
    timeLimitMs: null,
  };

  const roll = random();
  if (dailyAvailable && roll < 0.35) {
    return { ...base, kind: GAME_KINDS.daily, batchSize: "all", level: null, category: "mixed", choiceCount: 2, direction: "find" };
  }
  if (roll < 0.55) {
    return { ...base, kind: GAME_KINDS.match, ladder: GAME_LADDERS.umakuma };
  }
  if (roll < 0.8) {
    return { ...base, kind: GAME_KINDS.map, level: null, category: "vocabulary", batchSize: pick([10, 15, 20] as const, random) };
  }
  return {
    ...base,
    kind: GAME_KINDS.timeAttack,
    batchSize: "all",
    category: category === "radical" ? "mixed" : category,
    timeLimitMs: pick(GAME_TIME_LIMITS_MS.slice(1), random),
  };
}
