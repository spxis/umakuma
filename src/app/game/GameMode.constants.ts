import type { GameCategory, GameDateRange, GameMetric } from "@/lib/gameMode";

export const GAME_COPY = {
  title: "Game Mode",
  subtitle: "Fast rounds. Family bragging rights.",
  loading: "Loading Game Mode...",
  loadError: "Could not load Game Mode.",
  start: "Start game",
  starting: "Starting...",
  backToStudy: "Back to study",
  allLevels: "All levels",
  level: "Level",
  category: "Category",
  questions: "Questions",
  scoreboard: "Family scoreboard",
  noScores: "No completed games yet.",
  scoreRule: "Score = accuracy × 10,000. Time and best streak rank separately.",
  notEnoughItems: "This combination does not have enough started items.",
  chooseMatch: "Choose the matching item",
  score: "Score",
  time: "Time",
  streak: "Best streak",
  correct: "Correct",
  complete: "Round complete",
  playAgain: "Play again",
  questionsCorrect: "correct",
} as const;

export const GAME_CATEGORY_LABELS: Record<GameCategory, string> = {
  radical: "Radicals",
  kanji: "Kanji",
  vocabulary: "Vocabulary",
  mixed: "Mixed",
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
