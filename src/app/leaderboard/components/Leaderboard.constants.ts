import { SUBJECT_TYPE_DISPLAY, SUBJECT_TYPES } from "@/lib/domainConstants";

export const LEADERBOARD_JLPT_LABEL_ROWS = [
  ["N5", "N4", "N3"],
  ["N2", "N1"],
] as const;

export const LEADERBOARD_24H_OVERALL_LABELS = [
  "Score",
  "Reviews",
  "Level",
  SUBJECT_TYPE_DISPLAY[SUBJECT_TYPES.radical].plural,
  SUBJECT_TYPE_DISPLAY[SUBJECT_TYPES.vocabulary].plural,
  "Burned",
  "Learned Kanji",
] as const;

export const LEADERBOARD_24H_FOCUS_LABEL_BY_TAB = {
  dueNow: "Due now",
} as const;
