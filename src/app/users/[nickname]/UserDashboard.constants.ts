import { SUBJECT_TYPE_DISPLAY, SUBJECT_TYPES } from "@/lib/domainConstants";

export const LEVEL_PROGRESS_CARDS = [
  {
    key: SUBJECT_TYPES.radical,
    label: SUBJECT_TYPE_DISPLAY[SUBJECT_TYPES.radical].plural,
    barClassName: "bg-radical",
  },
  {
    key: SUBJECT_TYPES.kanji,
    label: SUBJECT_TYPE_DISPLAY[SUBJECT_TYPES.kanji].singular,
    barClassName: "bg-kanji",
  },
  {
    key: SUBJECT_TYPES.vocabulary,
    label: SUBJECT_TYPE_DISPLAY[SUBJECT_TYPES.vocabulary].singular,
    barClassName: "bg-vocabulary",
  },
] as const;

export const DASHBOARD_SUBJECT_TYPES = [
  SUBJECT_TYPES.radical,
  SUBJECT_TYPES.kanji,
  SUBJECT_TYPES.vocabulary,
] as const;
