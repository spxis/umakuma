import type { LevelItem } from "../../explorerTypes";

export const LEVEL_SUBJECT_TYPES = {
  radical: "radical",
  kanji: "kanji",
  vocabulary: "vocabulary",
} as const;

export const LEVEL_SUBJECT_STATUSES = {
  locked: "locked",
  apprentice: "apprentice",
  guru: "guru",
  master: "master",
  enlightened: "enlightened",
  burned: "burned",
} as const;

export function isRadicalSubjectType(type: LevelItem["subjectType"]): boolean {
  return type === LEVEL_SUBJECT_TYPES.radical;
}

export function isKanjiSubjectType(type: LevelItem["subjectType"]): boolean {
  return type === LEVEL_SUBJECT_TYPES.kanji;
}

export function isVocabularySubjectType(type: LevelItem["subjectType"]): boolean {
  return type === LEVEL_SUBJECT_TYPES.vocabulary;
}

export function isLockedStatus(status: LevelItem["status"]): boolean {
  return status === LEVEL_SUBJECT_STATUSES.locked;
}

export function isBurnedStatus(status: LevelItem["status"]): boolean {
  return status === LEVEL_SUBJECT_STATUSES.burned;
}
