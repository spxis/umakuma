import type { JlptNLevel } from "./kanjiLadder.types";

/** A Japanese primary school year. Secondary jōyō is grade 8 and is not one of these. */
export type SchoolGrade = 1 | 2 | 3 | 4 | 5 | 6;

/** Where a school year finishes on the grade ladder — always a level boundary. */
export type GradeMilestone = {
  grade: SchoolGrade;
  kanji: number;
  completeAtLevel: number;
};

/** One level of the grade ladder. */
export type GradeLadderLevel = {
  level: number;
  kanji: string[];
  /** The school year this level teaches; null past grade six and on level 1. */
  grade: SchoolGrade | null;
  vocabulary: number;
  radicals: number;
};

/** Where a kanji sits on the grade ladder, and what the other systems say. */
export type GradeLadderPlacement = {
  level: number;
  waniKaniLevel: number | null;
  nLevel: JlptNLevel | null;
  /** 1-6 for kyōiku, 8 for secondary jōyō, null where the catalogue is silent. */
  schoolGrade: number | null;
};

export type GradeLadder = {
  generatedAt: string;
  levels: number;
  totalKanji: number;
  stream: "UG";
  source: { waniKani: number; addedJoyo: number };
  gradeMilestones: GradeMilestone[];
  /** Where each JLPT band lands on this ordering, for comparing the two ladders. */
  milestones: { nLevel: JlptNLevel; kanji: number; completeAtLevel: number | null }[];
  radicalLevel: Record<string, number>;
  optionalRadicalLevel: Record<string, number>;
  vocabularyLevel: Record<string, number>;
  kanjiLevel: Record<string, GradeLadderPlacement>;
  ladder: GradeLadderLevel[];
};
