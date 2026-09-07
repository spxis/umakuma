import { LADDER_SOURCES, type LadderSource } from "./ladderCrosswalk";
import { radicalMeanings, radicalWkSubjectId } from "./radicalShapes";

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
  /** Its level on the UN ladder. */
  level: number;
  /** Its level on the UG ladder. Every subject has one; see `ugLevelFor`. */
  ugLevel: number;
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
  /**
   * Where the same subjects sit on the UG ladder, keyed the same way.
   *
   * Both ladders are written by `build-kanji-ladder.mjs` in one pass so they
   * cannot drift, and the seed used to copy only half of that into the
   * database. A subject the UN ladder places but UG does not is a build bug,
   * not a row to default - `ugLevelFor` refuses it.
   */
  grade: {
    kanji: Record<string, number>;
    radicals: Record<string, number>;
    vocabulary: Record<string, number>;
  };
  /** KANJIDIC2, which is the only content source for what WaniKani skips. */
  dictionary: ReadonlyMap<string, { meanings: string[]; onReadings: string[]; kunReadings: string[]; grade: number | null }>;
  /** WaniKani's kanji subject ids by character, so a row can link to its catalogue entry. */
  kanjiSubjectIds: ReadonlyMap<string, number>;
  /**
   * The written form of each WaniKani word, by subject id. The row carries it
   * so games, placement and the queue can draw a word without a catalogue
   * round trip - meanings, readings and mnemonics still resolve at read time.
   */
  vocabularyCharacters: ReadonlyMap<number, string>;
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

/**
 * The UG level for a subject the UN ladder places.
 *
 * Throws rather than defaulting: every one of the 2,235 kanji, 253 radicals
 * and 6,795 words places on both ladders today, and a gap would mean the two
 * were built from different inputs. Writing a 1 in that case would put the
 * subject on UG level 1 for every member and nothing would ever notice.
 */
function ugLevelFor(map: Record<string, number>, key: string, what: string): number {
  const level = map[key];
  if (level === undefined) throw new Error(`The UG ladder does not place ${what} ${key}, but the UN ladder does.`);
  return level;
}

function kanjiRows(input: LadderSeedInput): UkSubjectPlanRow[] {
  return Object.entries(input.kanji).map(([characters, placement]) => {
    const taughtByWanikani = placement.waniKaniLevel !== null;
    const entry = input.dictionary.get(characters);
    return {
      key: `kanji:${characters}`,
      kind: UK_SUBJECT_KINDS.kanji,
      characters,
      level: placement.level,
      ugLevel: ugLevelFor(input.grade.kanji, characters, "kanji"),
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
 * names most; the remaining six are katakana-shaped strokes that no dictionary
 * names, and `radicalShapes.ts` names those - they were shipping blank, with a
 * review card drawing the glyph where the meaning should have been.
 *
 * They do still link where WaniKani teaches the same shape. That link was
 * missing and it cost more than it looked: a WaniKani member importing their
 * progress matched **none** of their radicals, because the match is made on
 * `wkSubjectId` and every radical of ours had null. 196 of 241 have a
 * counterpart by character, so 196 items of somebody's work were being thrown
 * away on every import.
 *
 * By *shape* rather than by character, because the two sources spell three of
 * them differently - our 卜 is their ト - and matching on the codepoint alone
 * left the one John learned as *toe* with no counterpart at all.
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
      ugLevel: ugLevelFor(input.grade.radicals, characters, "radical"),
      wkSubjectId: radicalWkSubjectId(characters, input.radicalSubjectIds),
      source: LADDER_SOURCES.radkfile,
      nLevel: null,
      schoolGrade: null,
      meanings: radicalMeanings(characters, entry?.meanings),
      readings: [],
    };
  });
}

/** Vocabulary is WaniKani's throughout, so a row is a level and a pointer. */
function vocabularyRows(input: LadderSeedInput): UkSubjectPlanRow[] {
  return Object.entries(input.vocabulary).map(([id, level]) => ({
    key: `wk:${id}`,
    kind: UK_SUBJECT_KINDS.vocabulary,
    characters: input.vocabularyCharacters.get(Number(id)) ?? "",
    level,
    ugLevel: ugLevelFor(input.grade.vocabulary, id, "word"),
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
  ugLevel: number;
  wkSubjectId: number | null;
  source: string;
  nLevel: number | null;
  schoolGrade: number | null;
  meanings: string[];
  readings: string[];
  removedAt: Date | null;
};

/** Same words in the same order. Order carries meaning: the first is primary. */
function sameWords(plan: readonly string[], stored: readonly string[]): boolean {
  return plan.length === stored.length && plan.every((word, index) => word === stored[index]);
}

/*
 * What counts as a change.
 *
 * `meanings` and `readings` were missing from this comparison and from the
 * stored row it reads, which made the seeder blind to the only kind of fix
 * that matters for content: six radicals shipped with no meaning at all, the
 * plan was corrected to name them, and re-seeding counted every one of them
 * unchanged and wrote nothing. A row that moved level was updated; a row that
 * gained a name was not.
 */
function differs(plan: UkSubjectPlanRow, stored: UkSubjectStoredRow): boolean {
  return (
    plan.level !== stored.level ||
    plan.kind !== stored.kind ||
    plan.source !== stored.source ||
    plan.ugLevel !== stored.ugLevel ||
    plan.characters !== stored.characters ||
    plan.wkSubjectId !== stored.wkSubjectId ||
    plan.nLevel !== stored.nLevel ||
    plan.schoolGrade !== stored.schoolGrade ||
    !sameWords(plan.meanings, stored.meanings) ||
    !sameWords(plan.readings, stored.readings) ||
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
