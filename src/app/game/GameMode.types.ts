import type {
  GameBatchSize,
  GameCategory,
  GameDateRange,
  GameLeaderboardEntry,
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
  batchSize: GameBatchSize;
  level: number | null;
  category: GameCategory;
  range: GameDateRange;
  metric: GameMetric;
};
