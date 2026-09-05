import { SUBJECT_TYPES, type SubjectType } from "@/lib/domainConstants";
import { gradeBand, type KanjiGradeBand } from "@/lib/kanjiCoverage";


/**
 * Every item on the UmaKuma ladder, beside where the other systems put it.
 *
 * Four scales describe the same characters and none of them agree. WaniKani
 * teaches 2,101 kanji over 60 levels in an order built for its mnemonics; JLPT
 * sorts 2,211 into five bands; Japan's curriculum spreads them over nine school
 * years; and ours puts 2,235 over 100 levels. Deciding whether our ladder is
 * right means reading all four on one line, which nothing on the site does -
 * `kanjiCoverage.ts` gets closest and covers kanji only, from the database.
 *
 * So this is that line, for radicals and words as well as kanji. It is pure and
 * file-shaped: the ladder, the dictionary and the JLPT table are all committed
 * files, so the answer is the same in a test as in production, and only a WK
 * word's meaning needs the database.
 */

export const LADDER_SOURCES = {
  /** WaniKani teaches it too, and we take its meanings from their catalogue. */
  wanikani: "wanikani",
  /** Jōyō that WaniKani skips; KANJIDIC2 is where its facts come from. */
  kanjidic: "kanjidic",
  /** One of RADKFILE's 253 classical radicals, which WaniKani does not use. */
  radkfile: "radkfile",
  /** Added by an admin rather than computed, so the row carries its content. */
  admin: "admin",
} as const;

export type LadderSource = (typeof LADDER_SOURCES)[keyof typeof LADDER_SOURCES];

export const LADDER_SOURCE_VALUES = Object.values(LADDER_SOURCES);

export const LADDER_SOURCE_LABELS: Record<LadderSource, string> = {
  [LADDER_SOURCES.wanikani]: "WaniKani",
  [LADDER_SOURCES.kanjidic]: "KANJIDIC2",
  [LADDER_SOURCES.radkfile]: "RADKFILE",
  [LADDER_SOURCES.admin]: "Added here",
};

export type LadderRow = {
  /** Stable business key: `kanji:語`, `radical:口`, `wk:2467`. */
  key: string;
  kind: SubjectType;
  characters: string;
  /** Ours. 1-100. */
  ukLevel: number;
  /** WaniKani's, where they teach it. */
  wkLevel: number | null;
  wkSubjectId: number | null;
  nLevel: number | null;
  schoolGrade: number | null;
  band: KanjiGradeBand;
  /** Kanji: KANJIDIC's newspaper rank. Words: the blended corpus rank. */
  frequencyRank: number | null;
  primaryMeaning: string | null;
  source: LadderSource;
};

export type LadderCrosswalkInput = {
  /** `kanjiLevel` from the ladder: character -> its placement. */
  kanji: Record<string, { level: number; waniKaniLevel: number | null; nLevel: number | null }>;
  /** `radicalLevel` from the ladder: character -> level. */
  radicals: Record<string, number>;
  /** `vocabularyLevel` from the ladder: WK subject id (as text) -> level. */
  vocabulary: Record<string, number>;
  /** KANJIDIC2, for meanings, grades and print frequency. */
  dictionary: ReadonlyMap<string, { primaryMeaning: string | null; schoolGrade: number | null; frequencyRank: number | null }>;
  /**
   * What the curriculum calls each radical, by character.
   *
   * Handed in rather than worked out here. `UkSubject` is where a radical's
   * name is decided and every surface reads it from there; a second derivation
   * of the same fact drifted from the first, and this page was the one that
   * drifted. A radical the map does not name is drawn without one.
   */
  radicalNames: ReadonlyMap<string, string>;
  /** WaniKani's words, for the characters and meaning a subject id stands for. */
  words: ReadonlyMap<number, { characters: string; primaryMeaning: string | null; wkLevel: number }>;
  /** The blended corpus rank per WK subject id, from `wordFrequency.json`. */
  wordRank: Record<string, number>;
};

/** Beyond this a blended rank means "no corpus has seen it", not a position. */
const UNRANKED = 500_000;

function kanjiRow(
  characters: string,
  placement: { level: number; waniKaniLevel: number | null; nLevel: number | null },
  input: LadderCrosswalkInput,
): LadderRow {
  const entry = input.dictionary.get(characters);
  return {
    key: `kanji:${characters}`,
    kind: SUBJECT_TYPES.kanji,
    characters,
    ukLevel: placement.level,
    wkLevel: placement.waniKaniLevel,
    /* The ladder records WaniKani's level, not its subject id; a row that needs
       the id joins on the character through `words` or the catalogue. */
    wkSubjectId: null,
    nLevel: placement.nLevel,
    schoolGrade: entry?.schoolGrade ?? null,
    band: gradeBand(entry?.schoolGrade),
    frequencyRank: entry?.frequencyRank ?? null,
    primaryMeaning: entry?.primaryMeaning ?? null,
    source: placement.waniKaniLevel === null ? LADDER_SOURCES.kanjidic : LADDER_SOURCES.wanikani,
  };
}

function radicalRow(characters: string, level: number, input: LadderCrosswalkInput): LadderRow {
  /* The curriculum's own name, never the dictionary's first meaning: KANJIDIC
     describes the kanji, and 乙 the kanji is "the latter" where 乙 the radical
     is the fishhook. */
  const named = input.radicalNames.get(characters) ?? null;
  return {
    key: `radical:${characters}`,
    kind: SUBJECT_TYPES.radical,
    characters,
    ukLevel: level,
    wkLevel: null,
    wkSubjectId: null,
    nLevel: null,
    schoolGrade: null,
    band: gradeBand(null),
    frequencyRank: null,
    primaryMeaning: named,
    source: LADDER_SOURCES.radkfile,
  };
}

function wordRow(id: number, level: number, input: LadderCrosswalkInput): LadderRow | null {
  const word = input.words.get(id);
  if (!word) return null;
  const rank = input.wordRank[String(id)];
  return {
    key: `wk:${id}`,
    kind: SUBJECT_TYPES.vocabulary,
    characters: word.characters,
    ukLevel: level,
    wkLevel: word.wkLevel,
    wkSubjectId: id,
    nLevel: null,
    schoolGrade: null,
    band: gradeBand(null),
    frequencyRank: rank !== undefined && rank < UNRANKED ? rank : null,
    primaryMeaning: word.primaryMeaning,
    source: LADDER_SOURCES.wanikani,
  };
}

/**
 * Every ladder item as one row, in teaching order.
 *
 * Radicals first within a level, then kanji, then words - the order a level is
 * actually met in, and the order the build placed them in.
 */
export function buildLadderCrosswalk(input: LadderCrosswalkInput): LadderRow[] {
  const rows: LadderRow[] = [];

  for (const [characters, level] of Object.entries(input.radicals)) {
    rows.push(radicalRow(characters, level, input));
  }
  for (const [characters, placement] of Object.entries(input.kanji)) {
    rows.push(kanjiRow(characters, placement, input));
  }
  for (const [id, level] of Object.entries(input.vocabulary)) {
    const row = wordRow(Number(id), level, input);
    if (row) rows.push(row);
  }

  const kindOrder: Record<SubjectType, number> = {
    [SUBJECT_TYPES.radical]: 0,
    [SUBJECT_TYPES.kanji]: 1,
    [SUBJECT_TYPES.vocabulary]: 2,
  };

  return rows.sort(
    (left, right) =>
      left.ukLevel - right.ukLevel ||
      kindOrder[left.kind] - kindOrder[right.kind] ||
      (left.frequencyRank ?? Number.MAX_SAFE_INTEGER) - (right.frequencyRank ?? Number.MAX_SAFE_INTEGER) ||
      left.characters.localeCompare(right.characters),
  );
}
