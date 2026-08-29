import type {
  GameBatchSize,
  GameCategory,
  GameDateRange,
  GameKind,
  GameLeaderboardEntry,
  GameLeaderboardMode,
  GameMetric,
  GameQuestionPayload,
  GameRunSummary,
  GameTimeLimitMs,
} from "@/lib/gameMode";

export type GameKindAvailability = {
  daily: { dateKey: string; playedToday: boolean; levelCap: number };
  revenge: { available: number; troubleCount: number };
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
  hardMode: boolean;
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
