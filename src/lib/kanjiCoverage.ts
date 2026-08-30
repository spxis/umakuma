/**
 * Where each kanji sits across the sources we hold.
 *
 * Two catalogues describe overlapping but different sets: `JlptKanji`, keyed by
 * character with a JLPT level and a school grade, and `WkSubjectCatalog`, which
 * is whatever WaniKani teaches. Neither is a superset of the other, so a kanji
 * can be in both, in only one, or missing from both while still being one we
 * want to teach.
 *
 * Nothing here is persisted. Both sides already live in the database and change
 * on their own schedule — the WaniKani catalogue when it syncs, the JLPT table
 * when it is enriched — so a stored copy would be a third thing to keep true.
 * This computes the answer from the two tables on demand.
 */

/** KANJIDIC's grade field, which is not a simple 1-to-12 school year. */
export const KANJI_GRADE_BANDS = {
  /** Grades 1-6: the kyoiku set taught in grade school. */
  gradeSchool: "gradeSchool",
  /** Grade 8: jouyou kanji taught in secondary school. */
  secondary: "secondary",
  /** Grades 9 and 10: jinmeiyou, approved for names but outside jouyou. */
  nameKanji: "nameKanji",
  /** No grade recorded. */
  unclassified: "unclassified",
} as const;

export type KanjiGradeBand = (typeof KANJI_GRADE_BANDS)[keyof typeof KANJI_GRADE_BANDS];

export const KANJI_GRADE_BAND_VALUES = Object.values(KANJI_GRADE_BANDS);

export const KANJI_GRADE_BAND_LABELS: Record<KanjiGradeBand, string> = {
  [KANJI_GRADE_BANDS.gradeSchool]: "Grade school",
  [KANJI_GRADE_BANDS.secondary]: "Secondary",
  [KANJI_GRADE_BANDS.nameKanji]: "Name kanji",
  [KANJI_GRADE_BANDS.unclassified]: "Unclassified",
};

export const KANJI_SOURCES = {
  /** Present in both catalogues. */
  both: "both",
  /** In the JLPT table, absent from WaniKani. */
  jlptOnly: "jlptOnly",
  /** Taught by WaniKani, absent from the JLPT table. */
  wanikaniOnly: "wanikaniOnly",
} as const;

export type KanjiSource = (typeof KANJI_SOURCES)[keyof typeof KANJI_SOURCES];

export const KANJI_SOURCE_VALUES = Object.values(KANJI_SOURCES);

export const KANJI_SOURCE_LABELS: Record<KanjiSource, string> = {
  [KANJI_SOURCES.both]: "Both",
  [KANJI_SOURCES.jlptOnly]: "Missing from WaniKani",
  [KANJI_SOURCES.wanikaniOnly]: "Missing from JLPT data",
};

export const GRADE_SCHOOL_MAX = 6;
export const SECONDARY_GRADE = 8;
export const NAME_KANJI_MIN_GRADE = 9;

export function gradeBand(schoolGrade: number | null | undefined): KanjiGradeBand {
  if (schoolGrade === null || schoolGrade === undefined) {
    return KANJI_GRADE_BANDS.unclassified;
  }
  if (schoolGrade >= 1 && schoolGrade <= GRADE_SCHOOL_MAX) {
    return KANJI_GRADE_BANDS.gradeSchool;
  }
  if (schoolGrade === SECONDARY_GRADE) {
    return KANJI_GRADE_BANDS.secondary;
  }
  if (schoolGrade >= NAME_KANJI_MIN_GRADE) {
    return KANJI_GRADE_BANDS.nameKanji;
  }

  return KANJI_GRADE_BANDS.unclassified;
}

export type JlptCoverageRow = {
  kanji: string;
  nLevel: number;
  schoolGrade: number | null;
  frequencyRank: number | null;
  primaryMeaning: string | null;
};

export type WanikaniCoverageRow = {
  characters: string | null;
  wkSubjectId: number;
  level: number;
};

export type KanjiCoverageEntry = {
  kanji: string;
  source: KanjiSource;
  band: KanjiGradeBand;
  nLevel: number | null;
  schoolGrade: number | null;
  frequencyRank: number | null;
  primaryMeaning: string | null;
  wkSubjectId: number | null;
  wkLevel: number | null;
};

/**
 * Joins the two catalogues on the character itself.
 *
 * WaniKani rows without characters are skipped: a kanji subject always has one,
 * and a row that does not cannot be matched to anything.
 */
export function buildKanjiCoverage(
  jlptRows: readonly JlptCoverageRow[],
  wanikaniRows: readonly WanikaniCoverageRow[],
): KanjiCoverageEntry[] {
  const wanikaniByCharacter = new Map<string, WanikaniCoverageRow>();
  for (const row of wanikaniRows) {
    if (row.characters) {
      wanikaniByCharacter.set(row.characters, row);
    }
  }

  const entries: KanjiCoverageEntry[] = [];
  const seen = new Set<string>();

  for (const row of jlptRows) {
    const match = wanikaniByCharacter.get(row.kanji) ?? null;
    seen.add(row.kanji);
    entries.push({
      kanji: row.kanji,
      source: match ? KANJI_SOURCES.both : KANJI_SOURCES.jlptOnly,
      band: gradeBand(row.schoolGrade),
      nLevel: row.nLevel,
      schoolGrade: row.schoolGrade,
      frequencyRank: row.frequencyRank,
      primaryMeaning: row.primaryMeaning,
      wkSubjectId: match?.wkSubjectId ?? null,
      wkLevel: match?.level ?? null,
    });
  }

  for (const [character, row] of wanikaniByCharacter) {
    if (seen.has(character)) {
      continue;
    }

    entries.push({
      kanji: character,
      source: KANJI_SOURCES.wanikaniOnly,
      band: KANJI_GRADE_BANDS.unclassified,
      nLevel: null,
      schoolGrade: null,
      frequencyRank: null,
      primaryMeaning: null,
      wkSubjectId: row.wkSubjectId,
      wkLevel: row.level,
    });
  }

  return entries;
}

export type KanjiCoverageTotals = {
  total: number;
  bySource: Record<KanjiSource, number>;
  /** Only counts entries missing from WaniKani, which is the gap being tracked. */
  missingFromWanikaniByBand: Record<KanjiGradeBand, number>;
  missingFromWanikaniByNLevel: Record<number, number>;
};

function emptySourceCounts(): Record<KanjiSource, number> {
  return { both: 0, jlptOnly: 0, wanikaniOnly: 0 };
}

function emptyBandCounts(): Record<KanjiGradeBand, number> {
  return { gradeSchool: 0, secondary: 0, nameKanji: 0, unclassified: 0 };
}

export function summarizeKanjiCoverage(
  entries: readonly KanjiCoverageEntry[],
): KanjiCoverageTotals {
  const bySource = emptySourceCounts();
  const missingFromWanikaniByBand = emptyBandCounts();
  const missingFromWanikaniByNLevel: Record<number, number> = {};

  for (const entry of entries) {
    bySource[entry.source] += 1;

    if (entry.source !== KANJI_SOURCES.jlptOnly) {
      continue;
    }

    missingFromWanikaniByBand[entry.band] += 1;
    if (entry.nLevel !== null) {
      missingFromWanikaniByNLevel[entry.nLevel] =
        (missingFromWanikaniByNLevel[entry.nLevel] ?? 0) + 1;
    }
  }

  return {
    total: entries.length,
    bySource,
    missingFromWanikaniByBand,
    missingFromWanikaniByNLevel,
  };
}

/**
 * The gap, ordered the way it would be taught: commonest first, since frequency
 * is the best proxy we hold for what a reader meets soonest. Kanji with no
 * frequency rank sort last rather than first.
 */
export function missingFromWanikani(
  entries: readonly KanjiCoverageEntry[],
): KanjiCoverageEntry[] {
  return entries
    .filter((entry) => entry.source === KANJI_SOURCES.jlptOnly)
    .sort((left, right) => {
      const leftRank = left.frequencyRank ?? Number.MAX_SAFE_INTEGER;
      const rightRank = right.frequencyRank ?? Number.MAX_SAFE_INTEGER;
      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      return left.kanji.localeCompare(right.kanji);
    });
}
