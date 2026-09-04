import { LADDER_SOURCES, type LadderSource } from "./ladderCrosswalk";

/**
 * The rows `UkSubject` should hold, computed from the built ladder.
 *
 * Pure, so the plan can be read in a test without a database and compared
 * against what production actually has. The seed script applies it; the check
 * script diffs it. Neither decides anything on its own.
 *
 * Content only travels for items WaniKani does not teach. For the rest, the
 * catalogue already holds meanings and readings that sync on their own
 * schedule, and a copy here would be a second answer going stale.
 */

export const UK_SUBJECT_KINDS = {
  radical: "radical",
  kanji: "kanji",
  vocabulary: "vocabulary",
} as const;

export type UkSubjectKind = (typeof UK_SUBJECT_KINDS)[keyof typeof UK_SUBJECT_KINDS];

export type UkSubjectPlanRow = {
  key: string;
  kind: UkSubjectKind;
  characters: string;
  level: number;
  wkSubjectId: number | null;
  source: LadderSource;
  nLevel: number | null;
  schoolGrade: number | null;
  /** Empty for WaniKani-taught items; the catalogue answers for those. */
  meanings: string[];
  readings: string[];
};

export type LadderSeedInput = {
  kanji: Record<string, { level: number; waniKaniLevel: number | null; nLevel: number | null }>;
  radicals: Record<string, number>;
  vocabulary: Record<string, number>;
  /** KANJIDIC2, which is the only content source for what WaniKani skips. */
  dictionary: ReadonlyMap<string, { meanings: string[]; onReadings: string[]; kunReadings: string[]; grade: number | null }>;
  /** WaniKani's kanji subject ids by character, so a row can link to its catalogue entry. */
  kanjiSubjectIds: ReadonlyMap<string, number>;
  /**
   * WaniKani's *radical* subject ids by character.
   *
   * Separate from the kanji map on purpose: WaniKani teaches 七 twice, once as
   * a radical and once as a kanji, with different ids. Matching a radical of
   * ours to their kanji id would let somebody who learned the shape be
   * credited with knowing the character, which is not the same thing.
   */
  radicalSubjectIds?: ReadonlyMap<string, number>;
};

function kanjiRows(input: LadderSeedInput): UkSubjectPlanRow[] {
  return Object.entries(input.kanji).map(([characters, placement]) => {
    const taughtByWanikani = placement.waniKaniLevel !== null;
    const entry = input.dictionary.get(characters);
    return {
      key: `kanji:${characters}`,
      kind: UK_SUBJECT_KINDS.kanji,
      characters,
      level: placement.level,
      wkSubjectId: input.kanjiSubjectIds.get(characters) ?? null,
      source: taughtByWanikani ? LADDER_SOURCES.wanikani : LADDER_SOURCES.kanjidic,
      nLevel: placement.nLevel,
      schoolGrade: entry?.grade ?? null,
      meanings: taughtByWanikani ? [] : (entry?.meanings ?? []),
      readings: taughtByWanikani ? [] : [...(entry?.onReadings ?? []), ...(entry?.kunReadings ?? [])],
    };
  });
}

/**
 * Radicals are RADKFILE's list, which is not WaniKani's, so every one of them
 * carries its own content. 247 of the 253 are also kanji, so the dictionary
 * names most; the rest are shapes with no meaning of their own and stay empty.
 *
 * They do still link where WaniKani teaches the same character. That link was
 * missing and it cost more than it looked: a WaniKani member importing their
 * progress matched **none** of their radicals, because the match is made on
 * `wkSubjectId` and every radical of ours had null. 196 of 241 have a
 * counterpart by character, so 196 items of somebody's work were being thrown
 * away on every import.
 *
 * The source stays `radkfile` regardless — where an item came from and who
 * else teaches it are different questions, and the list is still RADKFILE's.
 */
function radicalRows(input: LadderSeedInput): UkSubjectPlanRow[] {
  return Object.entries(input.radicals).map(([characters, level]) => {
    const entry = input.dictionary.get(characters);
    return {
      key: `radical:${characters}`,
      kind: UK_SUBJECT_KINDS.radical,
      characters,
      level,
      wkSubjectId: input.radicalSubjectIds?.get(characters) ?? null,
      source: LADDER_SOURCES.radkfile,
      nLevel: null,
      schoolGrade: null,
      meanings: entry?.meanings ?? [],
      readings: [],
    };
  });
}

/** Vocabulary is WaniKani's throughout, so a row is a level and a pointer. */
function vocabularyRows(input: LadderSeedInput): UkSubjectPlanRow[] {
  return Object.entries(input.vocabulary).map(([id, level]) => ({
    key: `wk:${id}`,
    kind: UK_SUBJECT_KINDS.vocabulary,
    characters: "",
    level,
    wkSubjectId: Number(id),
    source: LADDER_SOURCES.wanikani,
    nLevel: null,
    schoolGrade: null,
    meanings: [],
    readings: [],
  }));
}

/**
 * Every row the curriculum should hold, keyed uniquely and ordered the way a
 * level is met: radicals, then kanji, then the words that use them.
 */
export function buildLadderSeedPlan(input: LadderSeedInput): UkSubjectPlanRow[] {
  const rows = [...radicalRows(input), ...kanjiRows(input), ...vocabularyRows(input)];
  const kindOrder: Record<UkSubjectKind, number> = { radical: 0, kanji: 1, vocabulary: 2 };
  return rows.sort(
    (left, right) => left.level - right.level || kindOrder[left.kind] - kindOrder[right.kind] || left.key.localeCompare(right.key),
  );
}

export type LadderSeedDiff = {
  create: UkSubjectPlanRow[];
  update: UkSubjectPlanRow[];
  /** Keys held that the plan no longer contains; soft-removed, never deleted. */
  remove: string[];
  unchanged: number;
};

export type UkSubjectStoredRow = {
  key: string;
  kind: string;
  characters: string;
  level: number;
  wkSubjectId: number | null;
  source: string;
  nLevel: number | null;
  schoolGrade: number | null;
  removedAt: Date | null;
};

function differs(plan: UkSubjectPlanRow, stored: UkSubjectStoredRow): boolean {
  return (
    plan.level !== stored.level ||
    plan.kind !== stored.kind ||
    plan.source !== stored.source ||
    plan.characters !== stored.characters ||
    plan.wkSubjectId !== stored.wkSubjectId ||
    plan.nLevel !== stored.nLevel ||
    plan.schoolGrade !== stored.schoolGrade ||
    stored.removedAt !== null
  );
}

/**
 * What a seed run would change, so the script can print it and a check can
 * fail on it without either of them re-deriving the comparison.
 */
export function diffLadderSeed(
  plan: readonly UkSubjectPlanRow[],
  stored: readonly UkSubjectStoredRow[],
): LadderSeedDiff {
  const held = new Map(stored.map((row) => [row.key, row]));
  const create: UkSubjectPlanRow[] = [];
  const update: UkSubjectPlanRow[] = [];
  let unchanged = 0;

  for (const row of plan) {
    const existing = held.get(row.key);
    if (!existing) create.push(row);
    else if (differs(row, existing)) update.push(row);
    else unchanged += 1;
  }

  const planned = new Set(plan.map((row) => row.key));
  const remove = stored.filter((row) => !planned.has(row.key) && row.removedAt === null).map((row) => row.key);

  return { create, update, remove, unchanged };
}
