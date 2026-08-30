import { GAME_KINDS, type GameKind } from "@/lib/gameMode";

/**
 * Per-item scoring for timed games, in tenths of a point.
 *
 * A flat score per answer ignored how fast the answer came, which made a
 * one-minute game feel arbitrary. Each correct answer is now worth up to 100
 * points: half guaranteed, half earned by answering quickly, decaying to zero
 * across the speed window. A wrong answer costs half of one item, so tapping at
 * random cannot out-earn deliberate play.
 */
export const GAME_ITEM_BASE_UNITS = 500;
export const GAME_ITEM_SPEED_UNITS = 500;
export const GAME_ITEM_SPEED_WINDOW_MS = 4_000;
export const GAME_ITEM_WRONG_UNITS = 500;

export function calculateGameScore(correctCount: number, questionCount: number, durationMs: number, level: number | null): number {
  if (
    !Number.isFinite(correctCount) ||
    !Number.isFinite(questionCount) ||
    !Number.isFinite(durationMs) ||
    questionCount <= 0
  ) {
    return 0;
  }

  const boundedQuestionCount = Math.trunc(questionCount);
  if (boundedQuestionCount <= 0) {
    return 0;
  }
  const boundedCorrect = Math.max(0, Math.min(Math.trunc(correctCount), boundedQuestionCount));
  const accuracy = boundedCorrect / boundedQuestionCount;
  const accuracyScoreUnits = Math.round(10_000 * accuracy);
  const boundedLevel = level === null || !Number.isFinite(level) ? 0 : Math.max(1, Math.min(60, Math.trunc(level)));
  const maximumModifierUnits = Math.max(0, Math.floor(10_000 / boundedQuestionCount) - 1);
  const maximumLevelBonusUnits = Math.round(maximumModifierUnits * 0.3);
  const maximumSpeedBonusUnits = maximumModifierUnits - maximumLevelBonusUnits;
  const levelBonusUnits = Math.round(maximumLevelBonusUnits * (boundedLevel / 60));
  const elapsedTenths = Math.floor(Math.max(0, durationMs) / 100);
  const speedBonusUnits = Math.max(0, maximumSpeedBonusUnits - elapsedTenths);
  const modifierUnits = Math.round((levelBonusUnits + speedBonusUnits) * accuracy);
  return accuracyScoreUnits + modifierUnits;
}

/**
 * Points for one answer in a timed game. `responseMs` is the time since the
 * previous answer, so a fast run of answers is worth more than a slow one.
 */
export function calculateItemScore(correct: boolean, responseMs: number): number {
  if (!correct) return -GAME_ITEM_WRONG_UNITS;
  const elapsed = Number.isFinite(responseMs) ? Math.max(0, responseMs) : GAME_ITEM_SPEED_WINDOW_MS;
  const remaining = Math.max(0, GAME_ITEM_SPEED_WINDOW_MS - elapsed) / GAME_ITEM_SPEED_WINDOW_MS;
  return GAME_ITEM_BASE_UNITS + Math.round(GAME_ITEM_SPEED_UNITS * remaining);
}

/** Running total for a timed game, never negative. */
export function accumulateItemScore(current: number, correct: boolean, responseMs: number): number {
  return Math.max(0, current + calculateItemScore(correct, responseMs));
}

export function resolveGameScore({
  kind,
  correctCount,
  questionCount,
  durationMs,
  level,
  accumulatedScore,
}: {
  kind: GameKind;
  correctCount: number;
  questionCount: number;
  durationMs: number;
  level: number | null;
  /** Timed games score per answer as they go, so the run already has its total. */
  accumulatedScore?: number;
}): number {
  if (kind === GAME_KINDS.timeAttack) {
    return Math.max(0, accumulatedScore ?? 0);
  }
  return calculateGameScore(correctCount, questionCount, durationMs, level);
}

export function formatGameScore(score: number): string {
  if (!Number.isFinite(score)) return "0.0";
  return (score / 10).toLocaleString("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}
