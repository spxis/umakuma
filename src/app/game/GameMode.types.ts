import type {
  GameBatchSize,
  GameCategory,
  GameDateRange,
  GameLeaderboardEntry,
  GameLeaderboardMode,
  GameMetric,
  GameQuestionPayload,
  GameRunSummary,
} from "@/lib/gameMode";

export type GameSetupResponse = {
  account: { nickname: string; wkUsername: string; wkLevel: number };
  batchSizes: GameBatchSize[];
  categories: GameCategory[];
  levels: number[];
  countsByLevel: Record<number, Record<GameCategory, number>>;
  totalCounts: Record<GameCategory, number>;
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

export type GamePhase = "lobby" | "playing" | "results";

export type ActiveGame = {
  run: GameRunSummary;
  questions: GameQuestionPayload[];
};

export type GameSelection = {
  batchSize: "all" | GameBatchSize;
  level: number | null;
  category: GameCategory;
};

export type GameLeaderboardFilters = {
  batchSize: "any" | GameBatchSize;
  level: "any" | number | null;
  mode: GameLeaderboardMode;
  range: GameDateRange;
  metric: GameMetric;
};
