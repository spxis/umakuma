/**
 * Copy for the school-grade explorer.
 *
 * Kept in one map rather than inline so the locale layer can swap it, and
 * Canadian spelling throughout per the audience rule.
 */
export const GRADE_EXPLORER_COPY = {
  heading: "School Grades",
  subtitle: "Kanji by Japanese school year, with their official readings",
  gradeLabel: "Grade",
  searchPlaceholder: "Search kanji, meaning, or reading",
  search: "Search",
  clear: "Clear",
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
  /*
   * Says what the data is rather than what we wish it were. The readings are
   * the joyo table's, which is the official list for general use - it is not
   * split by school year, and the line used to claim it was.
   */
  curriculumNote: "Readings are the official ones from the jōyō table, not a per-grade subset.",
  practiceSheet: "Writing practice sheet",
  quizOff: "Quiz me",
  quizOn: "Quiz on",
  quizHint: "Say the readings, then select a card to check.",
  quizReset: "Hide again",
  quizTapToReveal: "Tap to reveal",
} as const;

/** Page size for the grade grid; grade 8 alone runs to 1,110 entries. */
export const GRADE_PAGE_SIZE = 60;

/** The grade the explorer opens on when none is chosen. */
export const DEFAULT_GRADE = 1;
