/**
 * The rules both ladders promise to obey, written down once.
 *
 * Until now they lived in three places: prose in the plan, assertions scattered
 * across unit tests, and the head of whoever last touched the build. That is
 * fine while one person is building one ladder and stops being fine the moment
 * there are two of them and several sessions - a rule nobody can run is a rule
 * that quietly stops being true.
 *
 * Every rule here answers the same shape of question: given a built ladder and
 * the sources it was built from, which items break it? A rule returns the
 * offenders rather than a boolean, because "17 words arrive before a kanji they
 * are written with" is a bug report and `false` is not.
 *
 * Written as `.mjs` for the reason `ladderOps.mjs` is: the check script has to
 * import it at run time and a `.mjs` cannot import a `.ts`. The types travel as
 * JSDoc so the tests and any TypeScript caller still get them.
 *
 * @typedef {object} LadderLevel
 * @property {number} level
 * @property {string[]} kanji
 * @property {number} vocabulary
 * @property {number} radicals
 * @property {number | null} [grade]
 *
 * @typedef {object} BuiltLadder
 * @property {number} levels
 * @property {number} totalKanji
 * @property {Record<string, { level: number, nLevel: number | null, schoolGrade?: number | null }>} kanjiLevel
 * @property {Record<string, number>} radicalLevel
 * @property {Record<string, number>} optionalRadicalLevel
 * @property {Record<string, number>} vocabularyLevel
 * @property {LadderLevel[]} ladder
 *
 * @typedef {object} Violation
 * @property {string} rule
 * @property {string} detail
 * @property {string[]} [offenders]
 */

/** How far ahead of its first kanji a radical must be introduced. */
export const RADICAL_LEAD = 1;

/** The 2020 kyōiku list, grade by grade. A curriculum, not a guess. */
export const KYOIKU_COUNTS = [80, 160, 200, 202, 193, 191];

/** What the exam stream promises: the level each JLPT band is complete by. */
export const JLPT_PROMISE = { 5: 10, 4: 20, 3: 35, 2: 50, 1: 100 };

/**
 * The heaviest a level may be, counting everything in it.
 *
 * WaniKani's levels average 156 subjects and reach 213. Ours were built to sit
 * well under that; this catches a rebuild that quietly doubles a level rather
 * than enforcing a target.
 */
export const MAX_SUBJECTS_PER_LEVEL = 130;

/**
 * The CJK blocks a taught character comes from.
 *
 * Not `\p{Script=Han}`, which is wider than the question: Unicode files 々 as
 * Han, so a rule using it reads 人々 as needing a character called 々 - and
 * this checker duly reported 34 words on one ladder and 31 on the other as
 * arriving before a kanji they contain. The repetition mark is not a character
 * anybody learns; it says the one before it happens twice.
 *
 * The build had this right and had it privately, which is how the two
 * definitions came to disagree. It imports this one now.
 */
export const CJK_RANGES = [
  [0x4e00, 0x9fff],
  [0x3400, 0x4dbf],
];

export function isKanjiCharacter(character) {
  const code = character.codePointAt(0);
  return CJK_RANGES.some(([low, high]) => code >= low && code <= high);
}

const kanjiIn = (word) => [...word].filter((c) => isKanjiCharacter(c));

/** Every kanji the ladder should teach appears exactly once, and nothing else does. */
export function checkEveryKanjiTaughtOnce(ladder, expected) {
  const violations = [];
  const seen = new Map();
  for (const level of ladder.ladder) {
    for (const kanji of level.kanji) seen.set(kanji, (seen.get(kanji) ?? 0) + 1);
  }

  const twice = [...seen.entries()].filter(([, count]) => count > 1).map(([kanji]) => kanji);
  if (twice.length > 0) {
    violations.push({ rule: "every kanji once", detail: `${twice.length} taught more than once`, offenders: twice.slice(0, 10) });
  }

  const missing = [...expected].filter((kanji) => !seen.has(kanji));
  if (missing.length > 0) {
    violations.push({ rule: "every kanji taught", detail: `${missing.length} never taught`, offenders: missing.slice(0, 10) });
  }

  const extra = [...seen.keys()].filter((kanji) => !expected.has(kanji));
  if (extra.length > 0) {
    violations.push({ rule: "no stowaways", detail: `${extra.length} taught that are not in the set`, offenders: extra.slice(0, 10) });
  }

  if (seen.size !== ladder.totalKanji) {
    violations.push({ rule: "count agrees", detail: `ladder says ${ladder.totalKanji}, levels hold ${seen.size}` });
  }
  return violations;
}

/**
 * A radical is taught before the first kanji built from it.
 *
 * The hard rule of the whole curriculum: no character may arrive carrying a
 * piece nobody has seen. Radicals are RADKFILE's, so `parts` maps each radical
 * to the kanji it appears in.
 */
export function checkRadicalsComeFirst(ladder, radicals) {
  const violations = [];
  const late = [];
  const unplaced = [];

  for (const entry of radicals) {
    const level = ladder.radicalLevel[entry.radical] ?? ladder.optionalRadicalLevel[entry.radical];
    const users = [...entry.kanji].map((k) => ladder.kanjiLevel[k]?.level).filter((l) => l !== undefined);
    if (users.length === 0) {
      if (level === undefined) unplaced.push(entry.radical);
      continue;
    }
    if (level === undefined) {
      unplaced.push(entry.radical);
      continue;
    }
    const first = Math.min(...users);
    if (level > first - RADICAL_LEAD) late.push(`${entry.radical}@${level} but used at ${first}`);
  }

  if (late.length > 0) {
    violations.push({ rule: "radicals come first", detail: `${late.length} taught no earlier than a kanji using them`, offenders: late.slice(0, 10) });
  }
  if (unplaced.length > 0) {
    violations.push({ rule: "every radical placed", detail: `${unplaced.length} have no level at all`, offenders: unplaced.slice(0, 10) });
  }
  return violations;
}

/** A word is never taught before every kanji in it. */
export function checkWordsFollowTheirKanji(ladder, words) {
  const early = [];
  for (const word of words) {
    const level = ladder.vocabularyLevel[String(word.id)];
    if (level === undefined) continue;
    const parts = kanjiIn(word.characters).map((c) => ladder.kanjiLevel[c]?.level);
    if (parts.some((part) => part === undefined)) {
      early.push(`${word.characters} uses a kanji the ladder never teaches`);
      continue;
    }
    const floor = parts.length === 0 ? 1 : Math.max(...parts);
    if (level < floor) early.push(`${word.characters}@${level} needs ${floor}`);
  }
  return early.length === 0
    ? []
    : [{ rule: "words follow their kanji", detail: `${early.length} arrive too early`, offenders: early.slice(0, 10) }];
}

/**
 * Level 1 teaches radicals and no kanji.
 *
 * There is nowhere below level 1, so a kanji taught there arrives with its
 * parts at best alongside it. Both ladders answer this the same way.
 */
export function checkFirstLevelIsRadicalsOnly(ladder) {
  const first = ladder.ladder[0];
  const violations = [];
  if (!first) return [{ rule: "level 1 exists", detail: "the ladder has no levels" }];
  if (first.kanji.length > 0) {
    violations.push({ rule: "level 1 is radicals", detail: `level 1 teaches ${first.kanji.length} kanji`, offenders: first.kanji.slice(0, 10) });
  }
  if (first.radicals === 0) {
    violations.push({ rule: "level 1 is radicals", detail: "level 1 teaches no radicals either" });
  }
  return violations;
}

/** Every level exists, holds something, and is not a wall. */
export function checkLevelShape(ladder) {
  const violations = [];
  if (ladder.ladder.length !== ladder.levels) {
    violations.push({ rule: "levels present", detail: `expected ${ladder.levels}, found ${ladder.ladder.length}` });
  }
  const empty = [];
  const heavy = [];
  ladder.ladder.forEach((level, index) => {
    if (level.level !== index + 1) violations.push({ rule: "levels in order", detail: `position ${index + 1} says level ${level.level}` });
    const subjects = level.kanji.length + level.vocabulary + level.radicals;
    if (subjects === 0) empty.push(`level ${level.level}`);
    if (subjects > MAX_SUBJECTS_PER_LEVEL) heavy.push(`level ${level.level}: ${subjects} subjects`);
  });
  if (empty.length > 0) violations.push({ rule: "no empty level", detail: `${empty.length} hold nothing`, offenders: empty });
  if (heavy.length > 0) {
    violations.push({ rule: "no wall of a level", detail: `${heavy.length} exceed ${MAX_SUBJECTS_PER_LEVEL} subjects`, offenders: heavy.slice(0, 10) });
  }
  return violations;
}

/**
 * The exam stream's promise: every kanji of a band inside the level that band
 * is advertised as complete at. This is the whole reason UK is ordered as it is.
 */
export function checkJlptPromise(ladder) {
  const violations = [];
  for (const [band, through] of Object.entries(JLPT_PROMISE)) {
    const late = Object.entries(ladder.kanjiLevel)
      .filter(([, placement]) => placement.nLevel === Number(band))
      .filter(([, placement]) => placement.level > through)
      .map(([kanji, placement]) => `${kanji}@${placement.level}`);
    if (late.length > 0) {
      violations.push({ rule: `N${band} complete by ${through}`, detail: `${late.length} taught later`, offenders: late.slice(0, 10) });
    }
  }
  return violations;
}

/**
 * The school stream's promise: a grade is a whole number of levels, finishes
 * where the ladder says it finishes, and no level mixes two school years.
 */
export function checkGradePromise(ladder, milestones) {
  const violations = [];

  milestones.forEach((milestone, index) => {
    const expected = KYOIKU_COUNTS[index];
    if (milestone.kanji !== expected) {
      violations.push({ rule: `grade ${milestone.grade} size`, detail: `holds ${milestone.kanji}, the kyōiku list says ${expected}` });
    }
    const late = Object.entries(ladder.kanjiLevel)
      .filter(([, placement]) => placement.schoolGrade === milestone.grade)
      .filter(([, placement]) => placement.level > milestone.completeAtLevel)
      .map(([kanji, placement]) => `${kanji}@${placement.level}`);
    if (late.length > 0) {
      violations.push({
        rule: `grade ${milestone.grade} complete by ${milestone.completeAtLevel}`,
        detail: `${late.length} taught later`,
        offenders: late.slice(0, 10),
      });
    }
    if (index > 0 && milestone.completeAtLevel <= milestones[index - 1].completeAtLevel) {
      violations.push({ rule: "grades in order", detail: `grade ${milestone.grade} finishes at or before grade ${milestone.grade - 1}` });
    }
  });

  const straddling = [];
  for (const level of ladder.ladder) {
    const grades = new Set(
      level.kanji
        .map((kanji) => ladder.kanjiLevel[kanji]?.schoolGrade)
        .filter((grade) => typeof grade === "number" && grade <= 6),
    );
    if (grades.size > 1) straddling.push(`level ${level.level} holds grades ${[...grades].join(" and ")}`);
  }
  if (straddling.length > 0) {
    violations.push({ rule: "a level is one school year", detail: `${straddling.length} straddle two`, offenders: straddling.slice(0, 10) });
  }
  return violations;
}
