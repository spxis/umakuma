import {
  SUBJECT_TYPES,
  isSubjectType,
  srsBucketFromStage,
  type SrsBucket,
  type SubjectType,
} from "@/lib/domainConstants";

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
  /*
   * A kanji's on and kun readings, for the two lanes that show them.
   *
   * Absent rather than empty where a source does not know - the history rows
   * hold an attempt, not a subject - so a lane can tell "this word has none"
   * from "nobody asked".
   */
  onReadings?: string[];
  kunReadings?: string[];
  wkLevel: number | null;
  /*
   * The other ladders, and the two bands that are not ladders.
   *
   * A level lane that knew only WaniKani's number was blank for everything
   * WaniKani never taught, which is most of what a member can put on a list.
   * Absent where a surface has not looked them up.
   */
  unLevel?: number | null;
  ugLevel?: number | null;
  jlptLevel?: number | null;
  schoolGrade?: number | null;
  srsStage: number | null;
  srsBucket: SrsBucket;
};

/**
 * What a surface holds before it is a row.
 *
 * The explorers, the study queue and the bulk panel all carry the same subject
 * under slightly different names — `primaryReadings` before `readings`, a
 * `status` that is already an SRS bucket, a level that may be missing. Each was
 * flattening it by hand at the point of use, which is four copies of the same
 * seven lines and four chances for one of them to pick the wrong reading.
 */
export type SubjectListSource = {
  subjectId: number;
  characters: string;
  subjectType?: string | null;
  meanings?: string[] | null;
  readings?: string[] | null;
  primaryReadings?: string[] | null;
  onReadings?: string[] | null;
  kunReadings?: string[] | null;
  wkLevel?: number | null;
  unLevel?: number | null;
  ugLevel?: number | null;
  jlptLevel?: number | null;
  schoolGrade?: number | null;
  srsStage?: number | null;
  /** Already a bucket where the source has one; derived from the stage where not. */
  status?: SrsBucket | null;
};

/** A subject as the shared list renderers want it. */
export function toSubjectListRow(item: SubjectListSource): SubjectListRow {
  const srsStage = typeof item.srsStage === "number" ? item.srsStage : null;
  return {
    key: String(item.subjectId),
    subjectId: item.subjectId,
    subjectType: item.subjectType ?? "",
    glyph: item.characters,
    meaning: item.meanings?.[0] ?? "",
    reading: item.primaryReadings?.[0] ?? item.readings?.[0] ?? null,
    onReadings: item.onReadings ?? undefined,
    kunReadings: item.kunReadings ?? undefined,
    wkLevel: typeof item.wkLevel === "number" ? item.wkLevel : null,
    unLevel: item.unLevel ?? null,
    ugLevel: item.ugLevel ?? null,
    jlptLevel: item.jlptLevel ?? null,
    schoolGrade: item.schoolGrade ?? null,
    srsStage,
    srsBucket: item.status ?? srsBucketFromStage(srsStage),
  };
}

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
  /* The column headings. Shown from `md` up, where the lanes are separate. */
  columnItem: "Item",
  columnReading: "Reading",
  columnMeaning: "Meaning",
  columnType: "Type",
  columnLevel: "Level",
  columnSrs: "SRS",
} as const;

/**
 * The shape of a list, as opposed to a shelf of cards.
 *
 * A list is one surface with hairlines between its rows. Every explorer had
 * been drawing its rows as separate bordered boxes stacked with gaps, which
 * reads as forty small cards in a column rather than as a list — each row
 * carrying its own rounded border, its own padding and its own drop of colour,
 * so nothing lines up down the page and the eye stops at every edge.
 *
 * `SubjectRows` and all three explorers take their chrome from here, so a list
 * cannot go back to being boxes on one surface and not the others.
 */
export const SUBJECT_LIST_SURFACE = "overflow-hidden rounded-lg border border-line bg-surface";
export const SUBJECT_LIST_DIVIDERS = "divide-y divide-line/50";
/** One row: no border, no radius, no box — the surface above draws all of that. */
export const SUBJECT_LIST_ROW = "px-3 py-2 transition hover:bg-surface-muted/50";

/**
 * The lane widths every subject list shares.
 *
 * A list of subjects reads best as a table: the eye drops straight down one
 * column instead of re-finding where the reading sits on each line. That only
 * works if the heading row and every body row agree to the pixel, so the widths
 * live here rather than being written twice — the bulk panel's own `<table>`
 * proved the point by being the one surface that looked right and the one
 * surface nothing else could reuse.
 *
 * Below `md` the narrow lanes collapse and the reading rejoins the meaning
 * underneath it: six columns do not fit on a 393px phone, and a truncated
 * reading is worse than a stacked one.
 */
export const SUBJECT_ROW_LANES = {
  pick: "w-5 shrink-0",
  leading: "w-7 shrink-0",
  glyph: "w-16 shrink-0 sm:w-24",
  reading: "hidden w-24 shrink-0 md:block lg:w-32",
  meaning: "min-w-0 flex-1",
  /* Wide enough for the RADICAL pill, which is the longest of the three. */
  type: "hidden w-20 shrink-0 md:block",
  /* Two badges deep - ours over WaniKani's - so 40px is no longer enough. */
  level: "hidden w-14 shrink-0 md:block",
  srs: "hidden w-24 shrink-0 lg:block",
  /* Only wide enough to align from `md`, where the headings appear; below that
   * a fixed lane would spend 96px of a 393px screen on a single × button. */
  trailing: "shrink-0 md:w-24",
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
