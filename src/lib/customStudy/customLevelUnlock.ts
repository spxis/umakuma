export const CUSTOM_LEVEL_UNLOCK_THRESHOLD = 0.75;
export const CUSTOM_LEVEL_COMPLETE_SRS_STAGE = 5;

export type CustomLevelUnlockState = {
  ukLevel: number;
  srsStage: number;
  passedAt?: Date | null;
};

type CustomLevelStatRow = {
  total: number;
  guruEver: number;
};

function normalizeLevel(level: number): number {
  if (!Number.isFinite(level)) {
    return 1;
  }

  return Math.max(1, Math.trunc(level));
}

export function resolveCurrentCustomLevel(states: CustomLevelUnlockState[]): {
  currentLevel: number;
  maxLevel: number;
  levelStats: Record<number, CustomLevelStatRow>;
} {
  const levelStats: Record<number, CustomLevelStatRow> = {};
  let maxLevel = 0;

  for (const state of states) {
    const level = normalizeLevel(state.ukLevel);
    if (level > maxLevel) {
      maxLevel = level;
    }

    const row = levelStats[level] ?? { total: 0, guruEver: 0 };
    row.total += 1;
    if (state.srsStage >= CUSTOM_LEVEL_COMPLETE_SRS_STAGE || Boolean(state.passedAt)) {
      row.guruEver += 1;
    }
    levelStats[level] = row;
  }

  let currentLevel = 1;
  for (let level = 1; level < maxLevel; level += 1) {
    const row = levelStats[level];
    if (!row || row.total <= 0) {
      break;
    }

    if (row.guruEver / row.total >= CUSTOM_LEVEL_UNLOCK_THRESHOLD) {
      currentLevel = level + 1;
      continue;
    }

    break;
  }

  return {
    currentLevel,
    maxLevel,
    levelStats,
  };
}

export function isCustomLevelUnlocked(params: { itemLevel: number; currentLevel: number }): boolean {
  return normalizeLevel(params.itemLevel) <= Math.max(1, Math.trunc(params.currentLevel));
}