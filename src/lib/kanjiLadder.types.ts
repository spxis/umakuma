/** JLPT levels run N5 (easiest) to N1; 0 stands for "on no JLPT list". */
export type JlptNLevel = 1 | 2 | 3 | 4 | 5;

/** One level of the UmaKuma kanji ladder. */
export type KanjiLadderLevel = {
  level: number;
  /** The JLPT band this level belongs to. */
  nLevel: JlptNLevel;
  kanji: string[];
  /** How many of this level's kanji WaniKani also teaches. */
  fromWaniKani: number;
  /** How many are joyo kanji WaniKani never teaches. */
  added: number;
  /** Words unlocked at this level; never before their kanji. */
  vocabulary: number;
  /** Radicals introduced here, for the kanji this level teaches. */
  radicals: number;
};

/** The ladder level at which a JLPT level is fully covered. */
export type KanjiLadderMilestone = {
  nLevel: JlptNLevel;
  completeAtLevel: number;
  kanji: number;
};

/** Where a single kanji sits, on our ladder, on WaniKani's, and on the JLPT. */
export type KanjiLadderPlacement = {
  level: number;
  waniKaniLevel: number | null;
  /** What the JLPT says. Null for the 227 characters it does not list. */
  nLevel: JlptNLevel | null;
  /**
   * The band that decided where this kanji sits: its JLPT level where it has
   * one, otherwise the band its Japanese school year maps to. The two differ
   * for fourteen kanji — 分 is grade 2 and on no JLPT list — and anything
   * reasoning about placement wants this one, not `nLevel`.
   */
  teachingBand: JlptNLevel | null;
};

export type KanjiLadder = {
  generatedAt: string;
  levels: number;
  totalKanji: number;
  source: { waniKani: number; addedJoyo: number };
  milestones: KanjiLadderMilestone[];
  kanjiLevel: Record<string, KanjiLadderPlacement>;
  /** RADKFILE radical character -> the ladder level that introduces it. */
  radicalLevel: Record<string, number>;
  /** WaniKani vocabulary subject id -> the ladder level that teaches it. */
  vocabularyLevel: Record<string, number>;
  ladder: KanjiLadderLevel[];
};
