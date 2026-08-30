import type {
  GameBatchSize,
  GameCategory,
  GameAnswerMode,
  GameChoiceCount,
  GameDateRange,
  GameDirection,
  GameKind,
  GameLeaderboardEntry,
  GameLeaderboardMode,
  GameMetric,
  GamePracticeList,
  GameQuestionPayload,
  GameTaggedPracticeList,
  GameRunSummary,
  GameTimeLimitMs,
} from "@/lib/gameMode";

import type { MAP_TONES } from "./GameMode.constants";

/** How one prefecture is painted on the Map mode board. */
export type MapTone = (typeof MAP_TONES)[keyof typeof MAP_TONES];

export type GameKindAvailability = {
  daily: { dateKey: string; playedToday: boolean; levelCap: number };
  /**
   * What each Practice list holds, by category. Only tagged items the player has
   * actually started are counted, because that is all Practice can draw from.
   */
  practice: Record<GameTaggedPracticeList, Record<GameCategory, number>>;
  shiritori: { available: number };
};

export type GameSetupResponse = {
  account: { nickname: string; wkUsername: string; wkLevel: number };
  kinds: GameKind[];
  batchSizes: GameBatchSize[];
  timeLimitsMs: GameTimeLimitMs[];
  categories: GameCategory[];
  levels: number[];
  countsByLevel: Record<number, Record<GameCategory, number>>;
  totalCounts: Record<GameCategory, number>;
  availability: GameKindAvailability;
};

export type GameLeaderboardDay = {
  date: string;
  entries: GameLeaderboardEntry[];
};

export type GameLeaderboardResponse = {
  days: GameLeaderboardDay[];
  recent: GameLeaderboardEntry[];
  members: Array<{
    accountId: string;
    nickname: string;
    wkUsername: string;
  }>;
};

export type GameModeClientProps = {
  accountId: string;
  nickname: string;
  wkUsername: string;
};

export type GamePhase = "hub" | "lobby" | "playing" | "results";

export type ActiveGame = {
  run: GameRunSummary;
  questions: GameQuestionPayload[];
};

export type GameSelection = {
  kind: GameKind;
  batchSize: "all" | GameBatchSize;
  level: number | null;
  category: GameCategory;
  choiceCount: GameChoiceCount;
  direction: GameDirection;
  answerMode: GameAnswerMode;
  practiceList: GamePracticeList;
  ultraMode: boolean;
  timeLimitMs: GameTimeLimitMs;
};

export type GameLeaderboardFilters = {
  kind: "any" | GameKind;
  batchSize: "any" | GameBatchSize;
  level: "any" | number | null;
  mode: GameLeaderboardMode;
  range: GameDateRange;
  metric: GameMetric;
  hardMode: boolean;
  ultraMode: boolean;
};

/** Why a game cannot be started right now, so the card can say the real reason. */
export type GameBlockedReason = "played-today" | "not-enough-items";

/** Everything a hub card needs to describe and gate one game. */
export type GameHubCard = {
  kind: GameKind;
  available: number;
  minimumItems: number;
  playable: boolean;
  blockedReason: GameBlockedReason | null;
  statusLabel: string | null;
};
