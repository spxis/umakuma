import type { RelatedReference } from "@/lib/glyphTypes";

export type JlptWordExample = {
  written: string;
  pronounced: string;
  gloss: string;
  kanjiItems?: RelatedReference[];
};

export type JlptMeta = {
  primaryMeaning: string | null;
  meanings: string[];
  onReadings: string[];
  kunReadings: string[];
  nanoriReadings: string[];
  wordExamples: unknown;
  strokeCount: number | null;
  frequencyRank: number | null;
  schoolGrade: number | null;
  heisigKeyword: string | null;
};

/**
 * A row in a JLPT list, which is every JLPT kanji at once.
 *
 * Everything `JlptMeta` carries except `wordExamples`. The compounds are 93%
 * of the table's bytes - 9.8MB of 10.5MB across all 2,211 rows - and are only
 * ever read for the one kanji whose panel is open, so a list loads without
 * them and the open panel asks for its own.
 */
export type JlptKanjiRow = Omit<JlptMeta, "wordExamples"> & {
  kanji: string;
  nLevel: number;
  unicodeHex: string | null;
  sourceJlpt: number | null;
  notes: string[];
};
