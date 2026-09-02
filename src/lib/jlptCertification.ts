/**
 * JLPT certification, across both test systems.
 *
 * The exam was restructured in 2010. From 1984 to 2009 it ran four levels,
 * numbered 4 (easiest) to 1 (hardest). From July 2010 it runs five, N5
 * (easiest) to N1 (hardest). Both numbering schemes count down, which makes
 * them easy to confuse: old Level 4 is the *beginner* certificate and maps to
 * N5, not to N4.
 *
 * The year a test was taken determines which system it belonged to, so a form
 * can ask for the year first and then offer only the levels that existed.
 */

export const JLPT_SYSTEMS = {
  /** 1984-2009. Levels 4, 3, 2, 1. */
  classic: "classic",
  /** July 2010 onward. N5, N4, N3, N2, N1. */
  modern: "modern",
} as const;

export type JlptSystem = (typeof JLPT_SYSTEMS)[keyof typeof JLPT_SYSTEMS];

export const JLPT_SYSTEM_VALUES = Object.values(JLPT_SYSTEMS);

export const JLPT_FIRST_YEAR = 1984;
export const JLPT_LAST_CLASSIC_YEAR = 2009;
export const JLPT_FIRST_MODERN_YEAR = 2010;

export const CLASSIC_LEVELS = [1, 2, 3, 4] as const;
export const MODERN_LEVELS = [1, 2, 3, 4, 5] as const;

export type ClassicLevel = (typeof CLASSIC_LEVELS)[number];
export type ModernLevel = (typeof MODERN_LEVELS)[number];

export const JLPT_CERTIFICATION_STATUSES = {
  /** Holds a certificate. */
  passed: "passed",
  /** Intends to sit a test they have not taken yet. */
  planned: "planned",
  /** No certificate and no plans. */
  none: "none",
  /** Asked, chose not to answer. */
  undisclosed: "undisclosed",
} as const;

export type JlptCertificationStatus =
  (typeof JLPT_CERTIFICATION_STATUSES)[keyof typeof JLPT_CERTIFICATION_STATUSES];

export const JLPT_CERTIFICATION_STATUS_VALUES = Object.values(JLPT_CERTIFICATION_STATUSES);

export function isJlptSystem(value: string): value is JlptSystem {
  return (JLPT_SYSTEM_VALUES as string[]).includes(value);
}

export function isJlptCertificationStatus(value: string): value is JlptCertificationStatus {
  return (JLPT_CERTIFICATION_STATUS_VALUES as string[]).includes(value);
}

export function isClassicLevel(value: number): value is ClassicLevel {
  return (CLASSIC_LEVELS as readonly number[]).includes(value);
}

export function isModernLevel(value: number): value is ModernLevel {
  return (MODERN_LEVELS as readonly number[]).includes(value);
}

/**
 * Which system was in use in a given year. 2009 was the last year of the old
 * format; both 2010 sittings used the new one, so the boundary is clean.
 */
export function jlptSystemForYear(year: number): JlptSystem | null {
  if (!Number.isInteger(year) || year < JLPT_FIRST_YEAR) {
    return null;
  }

  return year <= JLPT_LAST_CLASSIC_YEAR ? JLPT_SYSTEMS.classic : JLPT_SYSTEMS.modern;
}

export function levelsForSystem(system: JlptSystem): readonly number[] {
  return system === JLPT_SYSTEMS.classic ? CLASSIC_LEVELS : MODERN_LEVELS;
}

/**
 * The official equivalences published when the test was restructured.
 *
 * N3 has no old counterpart: it was created to bridge the gap between old
 * Level 3 and old Level 2, which was the widest jump in the old ladder.
 */
const CLASSIC_TO_MODERN: Record<ClassicLevel, ModernLevel> = {
  1: 1,
  2: 2,
  3: 4,
  4: 5,
};

export type JlptEquivalence = {
  modernLevel: ModernLevel;
  /**
   * True when the mapping is an approximation rather than a restatement. Every
   * classic level is approximate — the official wording is "approximately the
   * same level" — and N1 was described as slightly broader than old Level 1.
   */
  approximate: boolean;
  note: string;
};

const CLASSIC_EQUIVALENCE_NOTES: Record<ClassicLevel, string> = {
  1: "About the same as N1, which covers slightly more advanced material.",
  2: "About the same as N2.",
  3: "About the same as N4. N3 was added later to bridge old Levels 3 and 2.",
  4: "About the same as N5.",
};

/** Places a certificate from either system on the modern N scale. */
export function toModernLevel(system: JlptSystem, level: number): JlptEquivalence | null {
  if (system === JLPT_SYSTEMS.modern) {
    if (!isModernLevel(level)) {
      return null;
    }

    return { modernLevel: level, approximate: false, note: "" };
  }

  if (!isClassicLevel(level)) {
    return null;
  }

  return {
    modernLevel: CLASSIC_TO_MODERN[level],
    approximate: true,
    note: CLASSIC_EQUIVALENCE_NOTES[level],
  };
}

/** How a certificate is written: "N4", or "Level 4 (pre-2010)". */
export function formatJlptLevel(system: JlptSystem, level: number): string {
  if (system === JLPT_SYSTEMS.modern) {
    return `N${level}`;
  }

  return `Level ${level} (pre-2010)`;
}

/**
 * Study benchmarks published for the old test. The new test replaced these with
 * "can-do" statements and publishes no official kanji or vocabulary counts, so
 * these are kept for the old levels only and should be presented as historical.
 */
export const CLASSIC_LEVEL_BENCHMARKS: Record<
  ClassicLevel,
  { kanji: number; vocabulary: number; studyHours: number }
> = {
  1: { kanji: 2000, vocabulary: 10000, studyHours: 900 },
  2: { kanji: 1000, vocabulary: 6000, studyHours: 600 },
  3: { kanji: 300, vocabulary: 1500, studyHours: 300 },
  4: { kanji: 100, vocabulary: 800, studyHours: 150 },
};
