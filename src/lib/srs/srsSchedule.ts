/**
 * WaniKani's stage schedule, which both of our ladders use.
 *
 * Nine stages, four hours to four months, and a wrong answer drops you back
 * rather than to zero. It lived in `customStudy/` because a member's uploaded
 * library was the first thing here that needed its own scheduler; the UmaKuma
 * curriculum is the second, and two copies of an interval table is how they
 * start disagreeing.
 *
 * The intervals are WaniKani's because our stages are: a member arriving with
 * forty levels of their progress keeps every interval rather than restarting,
 * and that only works if the two scales mean the same thing.
 *
 * Its companion, `customLevelUnlock.ts`, deliberately did *not* move. The two
 * ladders gate levels differently — an uploaded library counts every item in a
 * level, ours counts the level's kanji, or its radicals on level 1 where there
 * are none — so `resolveUnLevel` in `uk/unLevel.ts` is a separate rule rather
 * than a shared one wearing two hats.
 */
import { WK_STATUSES, srsBucketFromStage, type WkStatus, REVIEW_RESULTS } from "@/lib/domainConstants";

/** The top stage. An item that reaches it has finished its journey. */
export const SRS_BURNED_STAGE = 9;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const STAGE_INTERVAL_MS: Record<number, number | null> = {
  0: null,
  1: 4 * HOUR_MS,
  2: 8 * HOUR_MS,
  3: 23 * HOUR_MS,
  4: 47 * HOUR_MS,
  5: 7 * DAY_MS,
  6: 14 * DAY_MS,
  7: 30 * DAY_MS,
  8: 120 * DAY_MS,
  9: null,
};

const DEMOTION_MAP: Record<number, number> = {
  0: 0,
  1: 1,
  2: 1,
  3: 2,
  4: 3,
  5: 4,
  6: 5,
  7: 6,
  8: 7,
  9: 8,
};

function clampStage(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(9, Math.max(0, Math.trunc(value)));
}

export function srsGroupingFromStage(stage: number): WkStatus {
  const bucket = srsBucketFromStage(clampStage(stage));
  switch (bucket) {
    case WK_STATUSES.locked:
      return WK_STATUSES.locked;
    case WK_STATUSES.apprentice:
      return WK_STATUSES.apprentice;
    case WK_STATUSES.guru:
      return WK_STATUSES.guru;
    case WK_STATUSES.master:
      return WK_STATUSES.master;
    case WK_STATUSES.enlightened:
      return WK_STATUSES.enlightened;
    case WK_STATUSES.burned:
      return WK_STATUSES.burned;
    default:
      return WK_STATUSES.locked;
  }
}

export function nextSrsStage(params: {
  currentStage: number;
  result: "correct" | "wrong";
}): number {
  const stage = clampStage(params.currentStage);
  if (params.result === REVIEW_RESULTS.correct) {
    return Math.min(9, stage + 1);
  }

  return DEMOTION_MAP[stage] ?? 1;
}

export function nextStageAvailableAt(stage: number, now: Date = new Date()): Date | null {
  const clampedStage = clampStage(stage);
  const intervalMs = STAGE_INTERVAL_MS[clampedStage];
  if (intervalMs === null || intervalMs <= 0) {
    return null;
  }

  return new Date(now.getTime() + intervalMs);
}

export function initialLessonState(now: Date = new Date()): {
  srsStage: number;
  availableAt: Date | null;
  startedAt: Date;
  unlockedAt: Date;
} {
  return {
    srsStage: 1,
    availableAt: nextStageAvailableAt(1, now),
    startedAt: now,
    unlockedAt: now,
  };
}
