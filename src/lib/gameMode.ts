import type { SubjectType } from "@/lib/domainConstants";

export const GAME_BATCH_SIZES = [5, 10, 15, 20, 25, 50] as const;
export const GAME_ULTRA_BATCH_SIZE = -1;
export const GAME_CATEGORIES = ["radical", "kanji", "vocabulary", "mixed"] as const;
export const GAME_DATE_RANGES = ["today", "yesterday", "seven-days"] as const;
export const GAME_METRICS = ["score", "time", "streak"] as const;
export const GAME_KINDS = {
  match: "match",
  daily: "daily",
  revenge: "revenge",
  timeAttack: "time_attack",
  shiritori: "shiritori",
} as const;
export const GAME_KIND_VALUES = [
  GAME_KINDS.match,
  GAME_KINDS.daily,
  GAME_KINDS.revenge,
  GAME_KINDS.timeAttack,
  GAME_KINDS.shiritori,
] as const;
export const GAME_TIME_LIMITS_MS = [30_000, 60_000, 120_000] as const;
export const GAME_DAILY_QUESTION_COUNT = 10;
export const GAME_ENDLESS_CYCLE_SIZE = 25;
export const GAME_TIME_ATTACK_CORRECT_UNITS = 500;
export const GAME_TIME_ATTACK_WRONG_UNITS = 250;
export const GAME_TIME_ATTACK_GRACE_MS = 1_500;
export const GAME_REVENGE_TARGET_POOL_MULTIPLIER = 3;
export const GAME_REVENGE_MINIMUM_TARGET_POOL = 30;

export type GameBatchSize = (typeof GAME_BATCH_SIZES)[number];
export type GameCategory = (typeof GAME_CATEGORIES)[number];
export type GameDateRange = (typeof GAME_DATE_RANGES)[number];
export type GameMetric = (typeof GAME_METRICS)[number];
export type GameLeaderboardMode = "all" | GameCategory;
export type GameAnswerType = "reading" | "meaning" | "chain";
export type GameKind = (typeof GAME_KINDS)[keyof typeof GAME_KINDS];
export type GameTimeLimitMs = (typeof GAME_TIME_LIMITS_MS)[number];

export type GameKindRules = {
  usesBatchSize: boolean;
  usesLevel: boolean;
  requiresLevel: boolean;
  usesCategory: boolean;
  usesHardMode: boolean;
  usesUltraMode: boolean;
  usesTimeLimit: boolean;
  fixedQuestionCount: number | null;
  fixedCategory: GameCategory | null;
  oncePerDay: boolean;
  sharedPool: boolean;
};

export const GAME_KIND_RULES: Record<GameKind, GameKindRules> = {
  [GAME_KINDS.match]: {
    usesBatchSize: true,
    usesLevel: true,
    requiresLevel: false,
    usesCategory: true,
    usesHardMode: true,
    usesUltraMode: true,
    usesTimeLimit: false,
    fixedQuestionCount: null,
    fixedCategory: null,
    oncePerDay: false,
    sharedPool: false,
  },
  [GAME_KINDS.daily]: {
    usesBatchSize: false,
    usesLevel: false,
    requiresLevel: false,
    usesCategory: false,
    usesHardMode: false,
    usesUltraMode: false,
    usesTimeLimit: false,
    fixedQuestionCount: GAME_DAILY_QUESTION_COUNT,
    fixedCategory: "mixed",
    oncePerDay: true,
    sharedPool: true,
  },
  [GAME_KINDS.revenge]: {
    usesBatchSize: true,
    usesLevel: false,
    requiresLevel: false,
    usesCategory: true,
    usesHardMode: true,
    usesUltraMode: false,
    usesTimeLimit: false,
    fixedQuestionCount: null,
    fixedCategory: null,
    oncePerDay: false,
    sharedPool: false,
  },
  [GAME_KINDS.timeAttack]: {
    usesBatchSize: false,
    usesLevel: true,
    requiresLevel: false,
    usesCategory: true,
    usesHardMode: true,
    usesUltraMode: false,
    usesTimeLimit: true,
    fixedQuestionCount: null,
    fixedCategory: null,
    oncePerDay: false,
    sharedPool: false,
  },
  [GAME_KINDS.shiritori]: {
    usesBatchSize: false,
    usesLevel: false,
    requiresLevel: false,
    usesCategory: false,
    usesHardMode: true,
    usesUltraMode: false,
    usesTimeLimit: false,
    fixedQuestionCount: null,
    fixedCategory: "vocabulary",
    oncePerDay: false,
    sharedPool: false,
  },
};

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
  options: [GameOption, GameOption] | [GameOption, GameOption, GameOption];
};

export type GameRunSummary = {
  id: string;
  accountId: string;
  kind: GameKind;
  batchSize: number;
  timeLimitMs: number | null;
  level: number | null;
  category: GameCategory;
  hardMode: boolean;
  ultraMode: boolean;
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
  kind: GameKind;
  category: GameCategory;
  hardMode: boolean;
  ultraMode: boolean;
  batchSize: number;
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

export function isUltraGameBatchSize(value: number): boolean {
  return value === GAME_ULTRA_BATCH_SIZE;
}

export function isGameCategory(value: string): value is GameCategory {
  return GAME_CATEGORIES.includes(value as GameCategory);
}

export function isGameKind(value: string): value is GameKind {
  return GAME_KIND_VALUES.includes(value as GameKind);
}

export function isGameTimeLimitMs(value: number): value is GameTimeLimitMs {
  return GAME_TIME_LIMITS_MS.includes(value as GameTimeLimitMs);
}

export function gameKindRules(kind: GameKind): GameKindRules {
  return GAME_KIND_RULES[kind];
}

/**
 * Endless kinds append a fresh cycle instead of ending at `questionCount`.
 * Ultra stays a `match` variant so existing runs keep their recorded behavior.
 */
export function gameProgressFlags(kind: GameKind, ultraMode: boolean): {
  endless: boolean;
  endsOnWrong: boolean;
} {
  if (kind === GAME_KINDS.match) {
    return { endless: ultraMode, endsOnWrong: ultraMode };
  }
  if (kind === GAME_KINDS.timeAttack) {
    return { endless: true, endsOnWrong: false };
  }
  if (kind === GAME_KINDS.shiritori) {
    return { endless: true, endsOnWrong: true };
  }
  return { endless: false, endsOnWrong: false };
}

export function gameRunIsExpired(
  kind: GameKind,
  timeLimitMs: number | null,
  elapsedMs: number,
): boolean {
  if (kind !== GAME_KINDS.timeAttack || timeLimitMs === null) return false;
  return elapsedMs > timeLimitMs + GAME_TIME_ATTACK_GRACE_MS;
}

export function gameOptionIndexForKey(key: string, optionCount: 2 | 3): number | null {
  if (key === "ArrowLeft" || key === "1" || key === "4") return 0;
  if (optionCount === 3 && (key === "ArrowUp" || key === "ArrowDown" || key === "2" || key === "5")) return 1;
  if (key === "ArrowRight" || key === "3" || key === "6") return optionCount - 1;
  return null;
}

export function gameAnswerProgress({
  endless,
  endsOnWrong,
  expired = false,
  correct,
  answeredCount,
  questionCount,
  appendedQuestionCount,
}: {
  endless: boolean;
  endsOnWrong: boolean;
  expired?: boolean;
  correct: boolean;
  answeredCount: number;
  questionCount: number;
  appendedQuestionCount: number;
}): { complete: boolean; appendCycle: boolean; questionCount: number } {
  if (!endless) {
    return { complete: answeredCount >= questionCount, appendCycle: false, questionCount };
  }
  if (expired || (endsOnWrong && !correct)) {
    return { complete: true, appendCycle: false, questionCount: answeredCount };
  }
  const appendCycle = answeredCount >= questionCount;
  if (appendCycle && appendedQuestionCount <= 0) {
    // Nothing left to serve: an exhausted pool or a Shiritori chain with no continuation.
    return { complete: true, appendCycle: false, questionCount: answeredCount };
  }
  return {
    complete: false,
    appendCycle,
    questionCount: appendCycle ? questionCount + appendedQuestionCount : questionCount,
  };
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

/**
 * Time Attack fixes the clock and varies the volume, so the match formula (which
 * normalizes to a fixed question count and pays for speed) cannot rank it. Each
 * correct answer is worth a flat amount, each wrong answer costs half of one, and
 * the level bonus stays below a single correct answer so volume always outranks it.
 */
export function calculateTimeAttackScore(
  correctCount: number,
  answeredCount: number,
  level: number | null,
): number {
  if (!Number.isFinite(correctCount) || !Number.isFinite(answeredCount)) {
    return 0;
  }
  const answered = Math.max(0, Math.trunc(answeredCount));
  if (answered <= 0) {
    return 0;
  }
  const correct = Math.max(0, Math.min(Math.trunc(correctCount), answered));
  const wrong = answered - correct;
  const accuracy = correct / answered;
  const boundedLevel =
    level === null || !Number.isFinite(level) ? 0 : Math.max(1, Math.min(60, Math.trunc(level)));
  const levelBonusUnits = Math.round(
    (GAME_TIME_ATTACK_CORRECT_UNITS - 1) * (boundedLevel / 60) * accuracy,
  );
  const baseUnits =
    correct * GAME_TIME_ATTACK_CORRECT_UNITS - wrong * GAME_TIME_ATTACK_WRONG_UNITS;
  return Math.max(0, baseUnits + levelBonusUnits);
}

export function resolveGameScore({
  kind,
  correctCount,
  questionCount,
  durationMs,
  level,
}: {
  kind: GameKind;
  correctCount: number;
  questionCount: number;
  durationMs: number;
  level: number | null;
}): number {
  if (kind === GAME_KINDS.timeAttack) {
    return calculateTimeAttackScore(correctCount, questionCount, level);
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
