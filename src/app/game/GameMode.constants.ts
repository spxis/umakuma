import {
  GAME_KINDS,
  type GameCategory,
  type GameDateRange,
  type GameKind,
  type GameLeaderboardMode,
  type GameMetric,
} from "@/lib/gameMode";

export const GAME_COPY = {
  title: "Game Mode",
  subtitle: "Fast rounds. Family bragging rights.",
  hubTitle: "Games",
  hubSubtitle: "Five ways to play with the items you already know.",
  loading: "Loading Game Mode...",
  loadError: "Could not load Game Mode.",
  start: "Start game",
  starting: "Starting...",
  allLevels: "All levels",
  level: "Level",
  category: "Category",
  questions: "Questions",
  timeLimit: "Time limit",
  scoreboard: "Family scoreboard",
  recentGames: "Recent games",
  noScores: "No completed games yet.",
  noRecentGames: "No recent games yet.",
  scoreRule: "Accuracy earns up to 1,000 points. Level and every 0.1 second add bounded bonuses, but accuracy always wins.",
  notEnoughItems: "This combination does not have enough started items.",
  chooseMatch: "Choose the matching item",
  chooseChain: "Choose the word that starts with this kana",
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
  backToGames: "All games",
  changeGame: "Change game",
  play: "Play",
  timeUp: "Time!",
  chainLength: "Chain",
  dailyPlayed: "Played today",
  dailyReady: "Ready to play",
  dailyOneAttempt: "One attempt per day. Everyone gets the same questions.",
  resumedDaily: "Picking up today's unfinished attempt.",
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

export const GAME_KIND_LABELS: Record<GameKind, string> = {
  [GAME_KINDS.match]: "Match",
  [GAME_KINDS.daily]: "Daily Challenge",
  [GAME_KINDS.revenge]: "Revenge",
  [GAME_KINDS.timeAttack]: "Time Attack",
  [GAME_KINDS.shiritori]: "Shiritori",
};

export const GAME_KIND_TAGLINES: Record<GameKind, string> = {
  [GAME_KINDS.match]: "Fast rounds. Family bragging rights.",
  [GAME_KINDS.daily]: "Same questions for everyone. One shot.",
  [GAME_KINDS.revenge]: "A boss fight against your worst items.",
  [GAME_KINDS.timeAttack]: "Beat the clock, not the question count.",
  [GAME_KINDS.shiritori]: "Chain words by their last kana.",
};

export const GAME_KIND_RULE_COPY: Record<GameKind, string> = {
  [GAME_KINDS.match]: "Pick the item that matches the meaning or reading. Choose your level, category and round length.",
  [GAME_KINDS.daily]: "Ten questions drawn from items everyone in the family has unlocked. One attempt per day, same set for all players.",
  [GAME_KINDS.revenge]: "Targets the items you tagged as trouble first, then the ones your review history says you struggle with most.",
  [GAME_KINDS.timeAttack]: "Answer as many as you can before the clock runs out. Wrong answers cost you, but they do not end the run.",
  [GAME_KINDS.shiritori]: "Each word has to start with the kana the last one ended on. One wrong link ends the chain.",
};

export const GAME_KIND_EMOJI: Record<GameKind, string> = {
  [GAME_KINDS.match]: "⚡",
  [GAME_KINDS.daily]: "📅",
  [GAME_KINDS.revenge]: "🔥",
  [GAME_KINDS.timeAttack]: "⏱️",
  [GAME_KINDS.shiritori]: "🔗",
};

/** Per-game accents so each game reads as its own thing on the hub and scoreboard. */
export const GAME_KIND_ACCENT: Record<GameKind, { border: string; text: string; solid: string }> = {
  [GAME_KINDS.match]: { border: "border-accent/50", text: "text-accent", solid: "border-accent bg-accent text-white" },
  [GAME_KINDS.daily]: { border: "border-amber-500/50", text: "text-amber-600", solid: "border-amber-500 bg-amber-500 text-white" },
  [GAME_KINDS.revenge]: { border: "border-red-500/50", text: "text-red-600", solid: "border-red-600 bg-red-600 text-white" },
  [GAME_KINDS.timeAttack]: { border: "border-sky-500/50", text: "text-sky-600", solid: "border-sky-600 bg-sky-600 text-white" },
  [GAME_KINDS.shiritori]: { border: "border-emerald-500/50", text: "text-emerald-600", solid: "border-emerald-600 bg-emerald-600 text-white" },
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

export function gameTimeLimitLabel(timeLimitMs: number): string {
  const seconds = Math.round(timeLimitMs / 1000);
  return seconds >= 60 && seconds % 60 === 0 ? `${seconds / 60} min` : `${seconds}s`;
}
