export const REVIEW_DIFFICULTY_SORTS = {
  easiest: "easiest",
  hardest: "hardest",
} as const;

export type ReviewDifficultySort =
  (typeof REVIEW_DIFFICULTY_SORTS)[keyof typeof REVIEW_DIFFICULTY_SORTS];

export type ReviewPerformance = {
  correct: number;
  total: number;
};

export type ReviewDifficultyInput = {
  subjectId: number;
  srsStage: number;
  wkLevel?: number | null;
  passedAt?: string | null;
  performance?: ReviewPerformance;
};

const SUCCESS_WEIGHT = 0.55;
const SRS_WEIGHT = 0.3;
const LEVEL_WEIGHT = 0.1;
const RECENT_PASS_WEIGHT = 0.05;
const PRIOR_CORRECT = 2;
const PRIOR_TOTAL = 4;
const MAX_WK_LEVEL = 60;
const RECENT_PASS_WINDOW_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function recentPassScore(passedAt: string | null | undefined, nowMs: number): number {
  if (!passedAt) {
    return 0;
  }

  const passedAtMs = Date.parse(passedAt);
  if (!Number.isFinite(passedAtMs)) {
    return 0;
  }

  const ageDays = Math.max(0, (nowMs - passedAtMs) / DAY_MS);
  return clamp(1 - ageDays / RECENT_PASS_WINDOW_DAYS, 0, 1);
}

export function reviewEaseScore(input: ReviewDifficultyInput, nowMs: number = Date.now()): number {
  const correct = Math.max(0, input.performance?.correct ?? 0);
  const total = Math.max(correct, input.performance?.total ?? 0);
  const successScore = (correct + PRIOR_CORRECT) / (total + PRIOR_TOTAL);
  const srsScore = clamp((input.srsStage - 1) / 8, 0, 1);
  const level = clamp(input.wkLevel ?? MAX_WK_LEVEL, 1, MAX_WK_LEVEL);
  const levelScore = (MAX_WK_LEVEL - level) / (MAX_WK_LEVEL - 1);

  return (
    successScore * SUCCESS_WEIGHT +
    srsScore * SRS_WEIGHT +
    levelScore * LEVEL_WEIGHT +
    recentPassScore(input.passedAt, nowMs) * RECENT_PASS_WEIGHT
  );
}

export function sortReviewsByDifficulty<T extends ReviewDifficultyInput>(
  items: T[],
  sort: ReviewDifficultySort,
  nowMs: number = Date.now(),
): T[] {
  const direction = sort === REVIEW_DIFFICULTY_SORTS.easiest ? -1 : 1;

  return [...items].sort((a, b) => {
    const scoreDiff = reviewEaseScore(a, nowMs) - reviewEaseScore(b, nowMs);
    if (scoreDiff !== 0) {
      return direction * scoreDiff;
    }

    return a.subjectId - b.subjectId;
  });
}