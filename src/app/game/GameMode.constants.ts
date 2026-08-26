import type { GameCategory, GameDateRange, GameLeaderboardMode, GameMetric } from "@/lib/gameMode";

export const GAME_COPY = {
  title: "Game Mode",
  subtitle: "Fast rounds. Family bragging rights.",
  loading: "Loading Game Mode...",
  loadError: "Could not load Game Mode.",
  start: "Start game",
  starting: "Starting...",
  allLevels: "All levels",
  level: "Level",
  category: "Category",
  questions: "Questions",
  scoreboard: "Family scoreboard",
  recentGames: "Recent games",
  noScores: "No completed games yet.",
  noRecentGames: "No recent games yet.",
  scoreRule: "Accuracy earns up to 1,000 points. Level and every 0.1 second add bounded bonuses, but accuracy always wins.",
  notEnoughItems: "This combination does not have enough started items.",
  chooseMatch: "Choose the matching item",
  score: "Score",
  time: "Time",
  streak: "Best streak",
  correct: "Correct",
  complete: "Round complete",
  hardMode: "Hard mode",
  ultraMode: "Ultra mode",
  regularMode: "Regular",
  playAgain: "Play again",
  questionsCorrect: "correct",
} as const;

export const GAME_STORAGE_KEYS = {
  selection: "umakuma:game:selection",
  leaderboardFilters: "umakuma:game:leaderboard-filters:v2",
} as const;

export const GAME_CATEGORY_LABELS: Record<GameCategory, string> = {
  radical: "Radicals",
  kanji: "Kanji",
  vocabulary: "Vocabulary",
  mixed: "Mixed",
};

export const GAME_LEADERBOARD_MODE_LABELS: Record<GameLeaderboardMode, string> = {
  all: "Overall",
  ...GAME_CATEGORY_LABELS,
};

export const GAME_RANGE_LABELS: Record<GameDateRange, string> = {
  today: "Today",
  yesterday: "Yesterday",
  "seven-days": "Last 7 days",
};

export const GAME_METRIC_LABELS: Record<GameMetric, string> = {
  score: "Score",
  time: "Time",
  streak: "Best streak",
};

export const GAME_MIXED_PILL_CLASS = "subject-pill border-line bg-surface-muted text-foreground";
export const GAME_LEVEL_PILL_CLASS = "subject-pill border-accent/30 bg-accent/10 text-accent";

export function gameDifficultyLabel(hardMode: boolean, ultraMode: boolean): string {
  if (ultraMode) return hardMode ? "Ultra hard" : "Ultra";
  return hardMode ? "Hard" : GAME_COPY.regularMode;
}
