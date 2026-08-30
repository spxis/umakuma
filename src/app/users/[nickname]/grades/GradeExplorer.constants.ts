/**
 * Copy for the school-grade explorer.
 *
 * Kept in one map rather than inline so the locale layer can swap it, and
 * Canadian spelling throughout per the audience rule.
 */
export const GRADE_EXPLORER_COPY = {
  heading: "School Grades",
  subtitle: "Kanji by Japanese school year, with the readings taught at each grade",
  gradeLabel: "Grade",
  searchPlaceholder: "Search kanji, meaning, or reading",
  search: "Search",
  clear: "Clear",
  onReadings: "On",
  kunReadings: "Kun",
  noReadings: "—",
  noMatches: "No kanji match that search.",
  showing: "Showing",
  of: "of",
  kanjiWord: "kanji",
  previous: "Previous",
  next: "Next",
  page: "Page",
  strokes: "strokes",
  jlptCrossRef: "JLPT",
  wanikaniCrossRef: "WK",
  curriculumNote: "Readings shown are the ones approved for this grade.",
} as const;

/** Page size for the grade grid; grade 8 alone runs to 1,110 entries. */
export const GRADE_PAGE_SIZE = 60;

/** The grade the explorer opens on when none is chosen. */
export const DEFAULT_GRADE = 1;
