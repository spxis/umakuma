import type { SubjectType } from "@/lib/domainConstants";

export const GAME_BATCH_SIZES = [5, 10, 15, 20, 25, 50] as const;
export const GAME_CATEGORIES = ["radical", "kanji", "vocabulary", "mixed"] as const;
export const GAME_DATE_RANGES = ["today", "yesterday", "seven-days"] as const;
export const GAME_METRICS = ["score", "time", "streak"] as const;

export type GameBatchSize = (typeof GAME_BATCH_SIZES)[number];
export type GameCategory = (typeof GAME_CATEGORIES)[number];
export type GameDateRange = (typeof GAME_DATE_RANGES)[number];
export type GameMetric = (typeof GAME_METRICS)[number];
export type GameLeaderboardMode = "all" | GameCategory;
export type GameAnswerType = "reading" | "meaning";

export type GamePoolItem = {
  assignmentId: number;
  subjectId: number;
  subjectType: SubjectType;
  level: number;
  srsStage: number;
  startedAt: string | null;
};

export type GameOption = {
  subjectId: number;
  subjectType: SubjectType;
  level: number;
  characters: string;
  primaryMeaning: string | null;
  primaryReading: string | null;
};

export type GameQuestionPayload = {
  id: string;
  position: number;
  answerType: GameAnswerType;
  prompt: string;
  options: [GameOption, GameOption];
};

export type GameRunSummary = {
  id: string;
  accountId: string;
  batchSize: GameBatchSize;
  level: number | null;
  category: GameCategory;
  questionCount: number;
  answeredCount: number;
  correctCount: number;
  currentStreak: number;
  bestStreak: number;
  score: number;
  durationMs: number | null;
  status: "active" | "completed" | "abandoned";
  startedAt: string;
  completedAt: string | null;
};

export type GameLeaderboardEntry = {
  runId: string;
  accountId: string;
  nickname: string;
  wkUsername: string;
  category: GameCategory;
  batchSize: GameBatchSize;
  level: number | null;
  score: number;
  durationMs: number;
  bestStreak: number;
  correctCount: number;
  questionCount: number;
  completedAt: string;
  completedDatePst: string;
};

export function isGameBatchSize(value: number): value is GameBatchSize {
  return GAME_BATCH_SIZES.includes(value as GameBatchSize);
}

export function isGameCategory(value: string): value is GameCategory {
  return GAME_CATEGORIES.includes(value as GameCategory);
}

export function gameLeaderboardMemberIsEligible(
  wkLevel: number,
  reportLevel: "any" | "all" | number,
): boolean {
  return typeof reportLevel !== "number" || wkLevel >= reportLevel;
}

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

export function formatGameScore(score: number): string {
  if (!Number.isFinite(score)) return "0.0";
  return (score / 10).toLocaleString("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function gamePoolItemMatches(
  item: GamePoolItem,
  level: number | null,
  category: GameCategory,
): boolean {
  if (!item.startedAt || item.srsStage < 1 || item.srsStage > 9) {
    return false;
  }
  if (level !== null && item.level !== level) {
    return false;
  }
  return category === "mixed" || item.subjectType === category;
}

export function gameDateKeys(range: GameDateRange, todayKey: string): string[] {
  const today = new Date(`${todayKey}T12:00:00.000Z`);
  if (Number.isNaN(today.getTime())) return [];

  const count = range === "seven-days" ? 7 : 1;
  const initialOffset = range === "yesterday" ? 1 : 0;
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - initialOffset - index);
    return date.toISOString().slice(0, 10);
  });
}

export function formatGameDuration(durationMs: number | null): string {
  if (durationMs === null || !Number.isFinite(durationMs) || durationMs < 0) return "-";
  const totalTenths = Math.floor(durationMs / 100);
  const totalSeconds = Math.floor(totalTenths / 10);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}.${totalTenths % 10}`;
}
