/** Copy for the public kanji page, in one map for the locale layer. */
export const KANJI_PAGE_COPY = {
  meanings: "Meanings",
  onReadings: "On readings",
  kunReadings: "Kun readings",
  nameReadings: "Name readings",
  strokes: "Strokes",
  frequency: "Frequency",
  frequencyHint: "of the 2,500 most common",
  grade: "Grade",
  gradeJoyo: "Jōyō",
  gradeJinmeiyo: "Jinmeiyō (names)",
  gradeElementary: (grade: number) => `Elementary, year ${grade}`,
  jlptOld: "JLPT (old)",
  dictionaryCredit: "Dictionary data from",
  examples: "In use",
  sentenceCredit: "Example sentences from",
  backHome: "UmaKuma",
} as const;
