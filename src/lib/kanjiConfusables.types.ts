/**
 * Where a pairing came from.
 *
 * Kept because the three do not mean the same thing. A measured distance says
 * two shapes are close; WaniKani's list says a person who teaches kanji for a
 * living thought learners mix them up; a manual entry says we decided it after
 * the other two disagreed with a reader. A page can say which, and the
 * curation pass can sort by it.
 */
export const CONFUSABLE_SOURCES = {
  strokeEditDistance: "stroke-edit-distance",
  wanikani: "wanikani",
  manual: "manual",
} as const;

export type ConfusableSource = (typeof CONFUSABLE_SOURCES)[keyof typeof CONFUSABLE_SOURCES];

/** One character another is mistaken for. */
export type ConfusableNeighbour = {
  kanji: string;
  /** 0-1. A hand-made pairing scores 1; see `build-kanji-confusables.mjs`. */
  score: number;
  sources: ConfusableSource[];
};

export type KanjiConfusables = {
  generatedAt: string;
  minSimilarity: number;
  maxPerKanji: number;
  pairs: number;
  source: Record<ConfusableSource, number>;
  /** Character -> the characters it is confused with, strongest first. */
  neighbours: Record<string, ConfusableNeighbour[]>;
};
