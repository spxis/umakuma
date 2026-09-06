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
    uk: "UN",
    wk: "WK",
    jlpt: "JLPT",
    grade: "Grade",
    frequency: "Freq",
    source: "From",
    meaning: "Meaning",
  },
  /* The one place the two level scales are named side by side. */
  view: { rows: "Table", levels: "Levels" },
  levels: {
    noKanji: "Radicals and kana words only — no kanji at this level.",
    known: "known",
    hint: "Radicals in cyan, then that level's kanji, then its words.",
  },
  ukPrefix: "UN",
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

export const ADMIN_LADDER_OPS_COPY = {
  heading: "Move a kanji",
  blurb:
    "A move takes effect for members straight away — the item's level changes with the edit. The committed ladder is a file, though, so until the edits below are exported and shipped, a rebuild would undo them.",
  kanji: "Kanji",
  kanjiHint: "語",
  toLevel: "To level",
  reason: "Why",
  reasonHint: "comes up in level 9 words",
  moveIt: "Move it",
  /* The engine's own refusal, verbatim: "the level it is leaving would have no
     kanji left" tells an admin what to do differently; "could not save" does not. */
  refused: (reason: string) => `Refused — ${reason}.`,
  failed: "could not record that edit",
  none: "No edits waiting. The ladder in the database matches the committed one.",
  pending: (count: number) =>
    count === 1 ? "1 edit is not in the committed ladder yet" : `${count} edits are not in the committed ladder yet`,
  command: "pnpm ladder:overrides:export && pnpm build:kanji-ladder",
  movedFromTo: (from: number | null, to: number | null) =>
    from === null ? `→ ${to}` : `${from} → ${to}`,
  withdraw: "Withdraw",
} as const;
