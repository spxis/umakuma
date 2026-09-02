import type { MapCountryCode } from "@/lib/mapCountries";
import type { GameActivityByKind, GameKindActivity } from "@/lib/gameActivity";

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
  activity: GameActivityByKind;
  /** False for a member who has never connected WaniKani. */
  hasWanikani?: boolean;
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
  /** The member whose page this is, for the addresses the games live at. */
  member: string;
  /** The game the address names, or null for the hub. */
  initialKind: GameKind | null;
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
  /** Map only. Japan when unset, which is every other game and every old client. */
  mapCountry?: MapCountryCode;
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
/**
 * Why a game cannot be started.
 *
 * `needs-wanikani` is separate from `not-enough-items` because they call for
 * different things: one is answered by connecting an account, the other by
 * studying more. Collapsing them told a member with no connection that they had
 * "not enough items", which reads as a fault in the site.
 */
export type GameBlockedReason = "played-today" | "not-enough-items" | "needs-wanikani";

/** Everything a hub card needs to describe and gate one game. */
export type GameHubCard = {
  kind: GameKind;
  available: number;
  minimumItems: number;
  playable: boolean;
  blockedReason: GameBlockedReason | null;
  statusLabel: string | null;
  /** Who played this last, and who is in a round right now. */
  activity: GameKindActivity | null;
};
