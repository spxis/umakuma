import { SUBJECT_TYPES, isSubjectType, type SrsBucket, type SubjectType } from "@/lib/domainConstants";

/**
 * The shared vocabulary for every list of subjects in the app.
 *
 * Study history and the Trouble/Favourites lists hold different things — an
 * attempt is an event with an outcome and a time, a tagged item is a subject a
 * player marked — but a reader scanning either one wants the same row: the
 * glyph, what it means, and how far along it is. This is the shape both adapt
 * into so one renderer can draw both, with each source supplying its own
 * leading and trailing slots for the parts that genuinely differ.
 */
export type SubjectListRow = {
  /** Stable React key. Sources differ: an attempt id here, a subject id there. */
  key: string;
  subjectId: number;
  subjectType: string;
  glyph: string;
  meaning: string;
  reading: string | null;
  wkLevel: number | null;
  srsStage: number | null;
  srsBucket: SrsBucket;
};

export const SUBJECT_VIEW_MODES = {
  grid: "grid",
  list: "list",
} as const;

export type SubjectViewMode = (typeof SUBJECT_VIEW_MODES)[keyof typeof SUBJECT_VIEW_MODES];

export const SUBJECT_VIEW_MODE_VALUES = Object.values(SUBJECT_VIEW_MODES) as SubjectViewMode[];

export function isSubjectViewMode(value: string): value is SubjectViewMode {
  return SUBJECT_VIEW_MODE_VALUES.includes(value as SubjectViewMode);
}

/**
 * Copy for the shared list parts.
 *
 * Kept here rather than inline so the eventual locale layer swaps one map. The
 * toggle shows drawn icons rather than these words, so it stays legible at any
 * width; the words ride along as the accessible names and tooltips.
 */
export const SUBJECT_VIEW_COPY = {
  toggleLabel: "View as",
  grid: "Grid",
  list: "List",
  noMeaning: "—",
} as const;

/** Tailwind text colour for a subject's glyph, matching the explorer palette. */
export function subjectGlyphTone(subjectType: string): string {
  if (!isSubjectType(subjectType)) return "text-foreground";
  if (subjectType === SUBJECT_TYPES.radical) return "text-radical";
  if (subjectType === SUBJECT_TYPES.kanji) return "text-kanji";
  return "text-vocabulary";
}

/** Narrows a loose subject type string for the display helpers that need it. */
export function subjectTypeOrVocabulary(subjectType: string | null | undefined): SubjectType {
  return subjectType && isSubjectType(subjectType) ? subjectType : SUBJECT_TYPES.vocabulary;
}
