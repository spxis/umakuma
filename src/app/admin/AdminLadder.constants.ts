import { KANJI_GRADE_BANDS, type KanjiGradeBand } from "@/lib/kanjiCoverage";
import { SUBJECT_TYPES, SUBJECT_TYPE_DISPLAY, type SubjectType } from "@/lib/domainConstants";
import { LADDER_SOURCES, type LadderSource } from "@/lib/ladder/ladderCrosswalk";

/** Copy and chip styling for the ladder browser, in one module for the locale layer. */
export const ADMIN_LADDER_COPY = {
  label: "Curriculum",
  title: "The ladder",
  description:
    "Every radical, kanji and word we teach, beside where WaniKani, the JLPT and Japan's own curriculum put it. Read-only for now; moving things comes next.",
  loading: "Reading the ladder…",
  needsAuth: "Sign in as an admin to read the ladder.",
  loadFailed: "Could not read the ladder.",
  search: "Glyph or meaning…",
  allKinds: "All",
  allSources: "Any source",
  allBands: "Any band",
  anyJlpt: "Any JLPT",
  missingOnly: "Not in WaniKani",
  levelFrom: "From",
  levelTo: "To",
  clear: "Clear",
  items: "items",
  none: "Nothing matches those filters.",
  shape: "The shape of it",
  shapeHint: "Radicals, kanji and words per level. A tall bar is a heavy level.",
  milestone: (nLevel: number) => `N${nLevel} complete`,
  columns: {
    glyph: "Item",
    kind: "Kind",
    uk: "UK",
    wk: "WK",
    jlpt: "JLPT",
    grade: "Grade",
    frequency: "Freq",
    source: "From",
    meaning: "Meaning",
  },
  /* The one place the two level scales are named side by side. */
  ukPrefix: "UK",
  wkPrefix: "WK",
  notTaught: "—",
} as const;

export const LADDER_KIND_LABELS: Record<SubjectType, string> = {
  [SUBJECT_TYPES.radical]: SUBJECT_TYPE_DISPLAY[SUBJECT_TYPES.radical].plural,
  [SUBJECT_TYPES.kanji]: SUBJECT_TYPE_DISPLAY[SUBJECT_TYPES.kanji].plural,
  [SUBJECT_TYPES.vocabulary]: SUBJECT_TYPE_DISPLAY[SUBJECT_TYPES.vocabulary].plural,
};

/** The subject colours the rest of the site already uses for these three kinds. */
export const LADDER_KIND_BADGE: Record<SubjectType, string> = {
  [SUBJECT_TYPES.radical]: "bg-sky-100 text-sky-800",
  [SUBJECT_TYPES.kanji]: "bg-pink-100 text-pink-800",
  [SUBJECT_TYPES.vocabulary]: "bg-purple-100 text-purple-800",
};

export const LADDER_SOURCE_BADGE: Record<LadderSource, string> = {
  [LADDER_SOURCES.wanikani]: "bg-slate-100 text-slate-700",
  [LADDER_SOURCES.kanjidic]: "bg-amber-100 text-amber-800",
  [LADDER_SOURCES.radkfile]: "bg-teal-100 text-teal-800",
  [LADDER_SOURCES.admin]: "bg-indigo-100 text-indigo-800",
};

export const LADDER_BAND_LABELS: Record<KanjiGradeBand, string> = {
  [KANJI_GRADE_BANDS.gradeSchool]: "Grade school",
  [KANJI_GRADE_BANDS.secondary]: "Secondary",
  [KANJI_GRADE_BANDS.nameKanji]: "Name kanji",
  [KANJI_GRADE_BANDS.unclassified]: "Unclassified",
};
