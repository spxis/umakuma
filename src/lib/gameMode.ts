import type { SubjectType } from "@/lib/domainConstants";
import type { GameChoiceCount } from "@/lib/gameBoard";

// The board's own vocabulary lives in `gameBoard`; it is re-exported here so
// every caller keeps one import for the game domain.
export * from "@/lib/gameBoard";

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
  map: "map",
} as const;
export const GAME_KIND_VALUES = [
  GAME_KINDS.match,
  GAME_KINDS.daily,
  GAME_KINDS.revenge,
  GAME_KINDS.timeAttack,
  GAME_KINDS.shiritori,
  GAME_KINDS.map,
] as const;
export const GAME_TIME_LIMITS_MS = [30_000, 60_000, 120_000] as const;
export const GAME_DAILY_QUESTION_COUNT = 10;
/**
 * Daily Challenge sizes its pool to the regular players rather than to whoever
 * happens to have the lowest level. Taking the minimum across every account let
 * a single beginner pin the whole family to level 1. The cap is the lowest level
 * among the top few accounts, so it tracks the people actually competing.
 */
export const GAME_DAILY_LEVEL_COHORT = 3;
export const GAME_ENDLESS_CYCLE_SIZE = 25;
/**
 * Ultra repeats the whole pool until a wrong answer. A small pool (a handful of
 * radicals at one level) would otherwise never end, because the player stops
 * being challenged long before they slip. Cap it at a few full rounds.
 */
export const GAME_MAX_ENDLESS_CYCLES = 3;
/**
 * Which side of the pair the player picks.
 *
 * `find` shows the meaning or reading and asks for the glyph. `read` shows the
 * glyph and asks for its meaning, reading or romaji. Recognising a glyph is
 * easier than recalling one, so Read is the gentler direction.
 */
export const GAME_DIRECTIONS = { find: "find", read: "read" } as const;
export const GAME_DIRECTION_VALUES = [GAME_DIRECTIONS.find, GAME_DIRECTIONS.read] as const;

/** What the text side of a question is. `auto` varies it per question. */
export const GAME_ANSWER_MODES = ["auto", "meaning", "reading", "romaji"] as const;

/** Every mode any game offers, including the ones only Map uses. */
export const GAME_ALL_ANSWER_MODES = [...GAME_ANSWER_MODES, "capital"] as const;

/**
 * Map mode asks for a place name, whose meaning is already its romaji, so
 * offering both would put the same answer up twice in two spellings.
 */
/*
 * Map can also ask by capital: the prompt names a city and the answer is the
 * region that governs from it. Every dataset already carries a capital per
 * region, so this is a relabelling of the question Map already asks rather
 * than a second game.
 */
export const GAME_MAP_ANSWER_MODES = ["auto", "meaning", "reading", "capital"] as const;

export const GAME_TIME_ATTACK_GRACE_MS = 1_500;
export const GAME_PRACTICE_TARGET_POOL_MULTIPLIER = 3;
export const GAME_PRACTICE_MINIMUM_TARGET_POOL = 30;

/**
 * Which items Practice drills.
 *
 * `trouble` and `favorite` are the two lists the player curates themselves.
 * `toughest` needs no tagging at all: it ranks the whole pool by the shared
 * review-difficulty score, which is what Revenge did before Practice let the
 * player choose. The kind is still persisted as `revenge` so existing runs and
 * scoreboards keep their meaning.
 */
export const GAME_PRACTICE_LISTS = {
  trouble: "trouble",
  favorite: "favorite",
  toughest: "toughest",
} as const;
export const GAME_PRACTICE_LIST_VALUES = [
  GAME_PRACTICE_LISTS.trouble,
  GAME_PRACTICE_LISTS.favorite,
  GAME_PRACTICE_LISTS.toughest,
] as const;

export type GameBatchSize = (typeof GAME_BATCH_SIZES)[number];
export type GameCategory = (typeof GAME_CATEGORIES)[number];
export type GameDateRange = (typeof GAME_DATE_RANGES)[number];
export type GameMetric = (typeof GAME_METRICS)[number];
export type GameLeaderboardMode = "all" | GameCategory;
export type GameAnswerType = "reading" | "meaning" | "chain" | "romaji";
export type GameDirection = (typeof GAME_DIRECTIONS)[keyof typeof GAME_DIRECTIONS];
export type GameAnswerMode = (typeof GAME_ALL_ANSWER_MODES)[number];
export type GameKind = (typeof GAME_KINDS)[keyof typeof GAME_KINDS];
export type GameTimeLimitMs = (typeof GAME_TIME_LIMITS_MS)[number];
export type GamePracticeList = (typeof GAME_PRACTICE_LISTS)[keyof typeof GAME_PRACTICE_LISTS];
/** The lists built from tags, which are the only ones with something to count. */
export type GameTaggedPracticeList = Exclude<GamePracticeList, typeof GAME_PRACTICE_LISTS.toughest>;

export type GameKindRules = {
  usesBatchSize: boolean;
  usesLevel: boolean;
  requiresLevel: boolean;
  usesCategory: boolean;
  usesHardMode: boolean;
  usesUltraMode: boolean;
  usesTimeLimit: boolean;
  /** Whether the player chooses Find/Read and what the text side shows. */
  usesDirection: boolean;
  usesAnswerMode: boolean;
  /** Whether the player picks which of their lists the round drills. */
  usesPracticeList: boolean;
  /**
   * Whether the round is played on the four-corner board. Map mode answers on
   * the country instead, so its choice count is a count and not a corner.
   */
  usesCornersBoard: boolean;
  /** Whether the setup offers a country to play on. Map only. */
  usesMapCountry?: boolean;
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
    usesDirection: true,
    usesAnswerMode: true,
    usesPracticeList: false,
    usesCornersBoard: true,
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
    usesDirection: false,
    usesAnswerMode: false,
    usesPracticeList: false,
    usesCornersBoard: true,
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
    usesDirection: true,
    usesAnswerMode: true,
    usesPracticeList: true,
    usesCornersBoard: true,
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
    usesDirection: true,
    usesAnswerMode: true,
    usesPracticeList: false,
    usesCornersBoard: true,
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
    usesDirection: false,
    usesAnswerMode: false,
    usesPracticeList: false,
    usesCornersBoard: true,
    fixedQuestionCount: null,
    fixedCategory: "vocabulary",
    oncePerDay: false,
    sharedPool: false,
  },
  [GAME_KINDS.map]: {
    usesBatchSize: true,
    usesLevel: false,
    requiresLevel: false,
    usesCategory: false,
    usesHardMode: true,
    usesUltraMode: false,
    usesTimeLimit: false,
    usesDirection: true,
    usesAnswerMode: true,
    usesPracticeList: false,
    usesCornersBoard: false,
    /* Only Map plays somewhere, so only Map offers a country. */
    usesMapCountry: true,
    fixedQuestionCount: null,
    // Prefectures are place names, so they ride the vocabulary accent.
    fixedCategory: "vocabulary",
    oncePerDay: false,
    sharedPool: true,
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

/** A tile as rendered: an option plus the text it displays for this direction. */
export type GameOptionTile = GameOption & { label: string };

export type GameQuestionPayload = {
  id: string;
  position: number;
  answerType: GameAnswerType;
  prompt: string;
  /**
   * Set when the prompt is a shape rather than text, so the client knows what to
   * draw. Only Map mode's Read direction uses it, where the prompt is the
   * highlighted prefecture and the tiles carry the names.
   */
  promptSubjectId: number | null;
  /** Two, three or four tiles, in display order. */
  options: GameOptionTile[];
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
  choiceCount: GameChoiceCount;
  direction: GameDirection;
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
  /** Which country a Map run was played on; null for every other game. */
  mapCountry?: string | null;
  runId: string;
  accountId: string;
  nickname: string;
  wkUsername: string;
  kind: GameKind;
  category: GameCategory;
  hardMode: boolean;
  choiceCount: GameChoiceCount;
  direction: GameDirection;
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

/** True once an Ultra run has replayed the pool the maximum number of times. */
export function gameEndlessCycleLimitReached(questionCount: number, poolSize: number): boolean {
  if (!Number.isFinite(poolSize) || poolSize <= 0) return true;
  return questionCount >= poolSize * GAME_MAX_ENDLESS_CYCLES;
}

export function gameRunIsExpired(
  kind: GameKind,
  timeLimitMs: number | null,
  elapsedMs: number,
): boolean {
  if (kind !== GAME_KINDS.timeAttack || timeLimitMs === null) return false;
  return elapsedMs > timeLimitMs + GAME_TIME_ATTACK_GRACE_MS;
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

export function isGameDirection(value: string): value is GameDirection {
  return GAME_DIRECTION_VALUES.includes(value as GameDirection);
}

export function isGameAnswerMode(value: string): value is GameAnswerMode {
  // Accepts every mode any game offers; `resolveGameAnswerMode` then narrows
  // it to the ones this game actually has, so Match cannot inherit `capital`.
  return (GAME_ALL_ANSWER_MODES as readonly string[]).includes(value);
}

export function gameAnswerModesFor(kind: GameKind): readonly GameAnswerMode[] {
  return kind === GAME_KINDS.map ? GAME_MAP_ANSWER_MODES : GAME_ANSWER_MODES;
}

/** Falls back to `auto` when a stored choice is not offered by this game. */
export function resolveGameAnswerMode(kind: GameKind, mode: GameAnswerMode): GameAnswerMode {
  return gameAnswerModesFor(kind).includes(mode) ? mode : "auto";
}

export function isGamePracticeList(value: string): value is GamePracticeList {
  return GAME_PRACTICE_LIST_VALUES.includes(value as GamePracticeList);
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

