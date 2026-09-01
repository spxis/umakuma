/**
 * The shape of the generated KANJIDIC2 data.
 *
 * Kept beside the reader rather than inside it, per the repo's rule that
 * exported types live in an adjacent types module. The fields deliberately
 * match `SchoolGradeKanjiEntry` where the two overlap, so a caller can fall
 * through from one catalogue to the other without translating anything.
 */

export type KanjiDictionaryAttribution = {
  source: string;
  publisher: string;
  url: string;
  licence: string;
  licenceUrl: string;
  /** The KANJIDIC2 release this was built from, e.g. "2026-244". */
  databaseVersion: string | null;
  dateOfCreation: string | null;
};

export type KanjiDictionaryReadings = {
  on: string[];
  kun: string[];
  /** Readings a character takes only in names. */
  nanori: string[];
};

export type KanjiDictionaryEntry = {
  kanji: string;
  /** 1-6 kyoiku, 8 the rest of joyo, 9-10 jinmeiyo, null for everything else. */
  grade: number | null;
  strokeCount: number | null;
  /** Rank among the 2,501 most frequent characters in newspapers; null past that. */
  frequencyRank: number | null;
  /** The pre-2010 four-level JLPT, which is what KANJIDIC2 records. */
  jlptOld: number | null;
  radical: number | null;
  primaryMeaning: string;
  meanings: string[];
  readings: KanjiDictionaryReadings;
};

export type KanjiDictionaryFile = {
  attribution: Omit<KanjiDictionaryAttribution, "databaseVersion" | "dateOfCreation">;
  kanji: KanjiDictionaryEntry[];
};

export type KanjiDictionaryIndexFile = {
  file: string;
  grade: number | null;
  count: number;
  /** Every character in that file, so a lookup opens one file and no more. */
  characters: string;
};

export type KanjiDictionaryIndex = {
  attribution: KanjiDictionaryAttribution;
  totalCount: number;
  files: KanjiDictionaryIndexFile[];
};
