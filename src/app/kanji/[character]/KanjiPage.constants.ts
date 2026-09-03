/** Copy for the public kanji page, in one map for the locale layer. */
export const KANJI_PAGE_COPY = {
  meanings: "Meanings",
  strokes: "Strokes",
  frequency: "Frequency",
  frequencyHint: "of the 2,500 most common",
  grade: "Grade",
  gradeJoyo: "Jōyō",
  gradeJinmeiyo: "Jinmeiyō (names)",
  gradeElementary: (grade: number) => `Elementary, year ${grade}`,
  jlptOld: "JLPT (old)",
  jlpt: "JLPT",
  heisig: "Heisig",
  dictionaryCredit: "Dictionary data from",
  examples: "In use",
  sentenceCredit: "Example sentences from",
  backHome: "UmaKuma",
  /* Named for where it goes: the member's practice sheet, with this character picked. */
  worksheet: "Worksheet",
} as const;
