import { KANJI_GRADE_BANDS, type KanjiGradeBand } from "@/lib/kanjiCoverage";

export const KANJI_COVERAGE_COPY = {
  title: "Kanji coverage",
  subtitle: "Where every kanji sits across the JLPT table and the WaniKani catalogue.",
  gapHeading: "Missing from WaniKani",
  gapNote:
    "Ordered by frequency, commonest first, which is the closest thing we hold to the order a reader meets them.",
  bandHeading: "The gap by school band",
  reverseHeading: "Taught by WaniKani, absent from the JLPT table",
  totalLabel: "kanji tracked",
  bothLabel: "in both",
  gapLabel: "missing from WK",
  reverseLabel: "missing from JLPT",
  noFrequency: "no rank",
  noMeaning: "-",
  empty: "Nothing in this group.",
  bandExplainer:
    "KANJIDIC grades: 1-6 are the kyoiku set taught in grade school, 8 is jouyou taught in secondary school, and 9 and 10 are jinmeiyou, approved for names but outside jouyou.",
} as const;

export const KANJI_BAND_CLASSES: Record<KanjiGradeBand, string> = {
  [KANJI_GRADE_BANDS.gradeSchool]: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600",
  [KANJI_GRADE_BANDS.secondary]: "border-sky-500/40 bg-sky-500/10 text-sky-600",
  [KANJI_GRADE_BANDS.nameKanji]: "border-amber-500/40 bg-amber-500/10 text-amber-600",
  [KANJI_GRADE_BANDS.unclassified]: "border-slate-500/40 bg-slate-500/10 text-slate-600",
};
