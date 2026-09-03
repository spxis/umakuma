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
  /*
   * The parts of a character, each of which has an address of its own. The
   * titles are what a section page is called and what a shared link previews
   * as, so they name the part rather than the page.
   */
  sectionTitles: {
    stroke: "Stroke order",
    meanings: "Meanings and readings",
    words: "Words",
    related: "Related characters",
    mnemonics: "Mnemonics",
    examples: "In use",
  },
  sectionBack: (character: string) => `Everything about ${character}`,
  otherSections: "Also on this character",
  sentenceCredit: "Example sentences from",
  backHome: "UmaKuma",
} as const;
