import { SUBJECT_TYPES, type SubjectType } from "@/lib/domainConstants";
import { KANJI_LADDER_LEVELS, kanjiLadderLevels } from "@/lib/kanjiLadder";
import { UN_LEVEL_UNLOCK_THRESHOLD } from "@/lib/uk/unLevel";

/**
 * The curriculum, as the simulator meets it: level by level, item by item.
 *
 * Read off the shipped ladder rather than averaged, and the averaging is what
 * went wrong before. A flat 93 items and 22 kanji a level is right to two
 * significant figures over the whole hundred and wrong exactly where the
 * interesting questions live: level 1 teaches **no kanji at all** (fifteen
 * radicals and nineteen words) and level 2 teaches seven. Whether sitting down
 * twice a day helps is a question about a seven-item gate, and a model that
 * says every level is a twenty-two-kanji gate cannot answer it.
 *
 * Order inside a level is radicals, then kanji, then vocabulary — the ladder's
 * own promise that no kanji arrives carrying a piece never seen. It matters
 * here because it decides how soon the gate items are even started.
 */

export type SimLevelShape = {
  level: number;
  radicals: number;
  kanji: number;
  vocabulary: number;
  items: number;
  /** What this level is gated on: its kanji, or its radicals where it has none. */
  gateKind: SubjectType;
  /** How many of the gate kind must have reached Guru. */
  gateNeed: number;
};

function shapeOf(level: { level: number; radicals: number; kanji: string[]; vocabulary: number }): SimLevelShape {
  const kanji = level.kanji.length;
  /* Mirrors `resolveUnLevel`: level 1 is radicals only, so counting kanji
     there would divide by zero and hand every new member level 2 on day one. */
  const gateKind = kanji > 0 ? SUBJECT_TYPES.kanji : SUBJECT_TYPES.radical;
  const gateTotal = kanji > 0 ? kanji : level.radicals;
  return {
    level: level.level,
    radicals: level.radicals,
    kanji,
    vocabulary: level.vocabulary,
    items: level.radicals + kanji + level.vocabulary,
    gateKind,
    gateNeed: Math.ceil(gateTotal * UN_LEVEL_UNLOCK_THRESHOLD),
  };
}

export const SIM_LEVEL_SHAPES: readonly SimLevelShape[] = kanjiLadderLevels().map(shapeOf);

export const SIM_TOTAL_ITEMS = SIM_LEVEL_SHAPES.reduce((total, shape) => total + shape.items, 0);

/** Items unlocked once a member stands at `level`, counted from the bottom. */
const CUMULATIVE_ITEMS: readonly number[] = SIM_LEVEL_SHAPES.reduce<number[]>((running, shape, index) => {
  running.push((running[index - 1] ?? 0) + shape.items);
  return running;
}, []);

export function itemsThroughLevel(level: number): number {
  if (level <= 0) return 0;
  return CUMULATIVE_ITEMS[Math.min(level, KANJI_LADDER_LEVELS) - 1];
}

export function levelShape(level: number): SimLevelShape | null {
  return SIM_LEVEL_SHAPES[level - 1] ?? null;
}

/**
 * Every item of the curriculum in the order it is taught, as two flat arrays.
 *
 * Built once and shared, because thirty personas over three years is thirty
 * walks of the same nine thousand items and rebuilding it each time is the
 * only part of this that would be slow. Typed arrays rather than objects: a
 * level fits in a byte and a kind fits in two bits.
 */
const KIND_CODES: readonly SubjectType[] = [SUBJECT_TYPES.radical, SUBJECT_TYPES.kanji, SUBJECT_TYPES.vocabulary];

function buildSequence(): { levels: Uint8Array; kinds: Uint8Array } {
  const levels = new Uint8Array(SIM_TOTAL_ITEMS);
  const kinds = new Uint8Array(SIM_TOTAL_ITEMS);
  let at = 0;
  for (const shape of SIM_LEVEL_SHAPES) {
    const counts = [shape.radicals, shape.kanji, shape.vocabulary];
    for (let code = 0; code < counts.length; code += 1) {
      for (let made = 0; made < counts[code]; made += 1) {
        levels[at] = shape.level;
        kinds[at] = code;
        at += 1;
      }
    }
  }
  return { levels, kinds };
}

const SEQUENCE = buildSequence();

/** The level and kind of the nth item taught, counting from zero. */
export function curriculumItemAt(index: number): { level: number; kind: SubjectType } | null {
  if (index < 0 || index >= SIM_TOTAL_ITEMS) return null;
  return { level: SEQUENCE.levels[index], kind: KIND_CODES[SEQUENCE.kinds[index]] };
}

/**
 * Whether a level clears, given how many of its gate items have ever passed.
 *
 * "Ever" is the real rule, not a simplification: `resolveUnLevel` counts an
 * item that has *reached* Guru, not one that is sitting there, so a kanji
 * knocked back to Apprentice does not un-clear a level somebody already
 * cleared. Getting that wrong would have invented a demotion the site does
 * not have.
 */
export function levelClears(level: number, passed: number): boolean {
  const shape = levelShape(level);
  if (!shape) return false;
  /* A level with nothing in it is a gap in the curriculum, not an obstacle. */
  if (shape.gateNeed === 0) return true;
  return passed >= shape.gateNeed;
}
