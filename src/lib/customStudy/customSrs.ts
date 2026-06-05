import { WK_STATUSES, srsBucketFromStage, type WkStatus } from "@/lib/domainConstants";

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

export function toCustomSrsGrouping(stage: number): WkStatus {
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

export function nextCustomSrsStage(params: {
  currentStage: number;
  result: "correct" | "wrong";
}): number {
  const stage = clampStage(params.currentStage);
  if (params.result === "correct") {
    return Math.min(9, stage + 1);
  }

  return DEMOTION_MAP[stage] ?? 1;
}

export function nextCustomStageAvailableAt(stage: number, now: Date = new Date()): Date | null {
  const clampedStage = clampStage(stage);
  const intervalMs = STAGE_INTERVAL_MS[clampedStage];
  if (intervalMs === null || intervalMs <= 0) {
    return null;
  }

  return new Date(now.getTime() + intervalMs);
}

export function initialCustomLessonState(now: Date = new Date()): {
  srsStage: number;
  availableAt: Date | null;
  startedAt: Date;
  unlockedAt: Date;
} {
  return {
    srsStage: 1,
    availableAt: nextCustomStageAvailableAt(1, now),
    startedAt: now,
    unlockedAt: now,
  };
}
