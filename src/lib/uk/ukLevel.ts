import { SUBJECT_TYPES } from "@/lib/domainConstants";
import { KANJI_LADDER_LEVELS } from "@/lib/kanjiLadder";

/**
 * Where a member stands on our hundred levels.
 *
 * Three ideas hold this together, and they are what make the ladder editable
 * without costing anybody progress:
 *
 * 1. **State is per item.** A rebuild that moves 語 from level 12 to level 9
 *    touches no state row. The member still knows 語.
 * 2. **Level is derived**, by walking up from the floor: a level clears when
 *    at least 90% of its *kanji* have reached Guru. Radicals gate level 1,
 *    where there are no kanji to count.
 * 3. **The floor is the only stored input.** Placement, a WaniKani import, a
 *    bump-up and an admin raise it; nothing lowers it. So a curriculum change
 *    can add work below somebody, and it arrives as lessons rather than as a
 *    demotion.
 *
 * The 90% is WaniKani's own bar and the same one the custom-study stack uses,
 * which is why it is named here rather than typed as 0.9 in three files.
 */

export const UK_LEVEL_UNLOCK_THRESHOLD = 0.9;
/** Guru. The stage at which an item counts as learned for a level gate. */
export const UK_LEVEL_PASS_SRS_STAGE = 5;
export const UK_FIRST_LEVEL = 1;

export type UkLevelTotals = {
  level: number;
  /** Kanji the level teaches. Zero on level 1, which is radicals only. */
  kanji: number;
  radicals: number;
};

export type UkLevelProgressRow = {
  level: number;
  kind: string;
  srsStage: number;
  passedAt: Date | null;
};

/**
 * The gate for one level: its kanji, or its radicals where it teaches none.
 *
 * Level 1 is radicals only, by design — it is the easier way in, and the parts
 * come before the characters. Counting kanji there would divide by zero and
 * hand every new member level 2 on their first day.
 */
function gateKindFor(totals: UkLevelTotals): string {
  return totals.kanji > 0 ? SUBJECT_TYPES.kanji : SUBJECT_TYPES.radical;
}

function gateTotalFor(totals: UkLevelTotals): number {
  return totals.kanji > 0 ? totals.kanji : totals.radicals;
}

/** An item counts once it has ever reached Guru, not only while it sits there. */
function hasPassed(row: UkLevelProgressRow): boolean {
  return row.passedAt !== null || row.srsStage >= UK_LEVEL_PASS_SRS_STAGE;
}

export type UkLevelResolution = {
  level: number;
  /** How far through the level they are, 0-1, for the level it stopped on. */
  ratio: number;
  passed: number;
  total: number;
  /** What the level is actually gated on, so a caller can name it correctly. */
  gate: string;
};

/**
 * Walks up from the floor while each level clears, and stops on the first that
 * does not. A level with no items at all does not block: an empty level is a
 * gap in the curriculum, not an obstacle a member can do anything about.
 */
export function resolveUkLevel({
  rows,
  totals,
  floor,
  maxLevel = KANJI_LADDER_LEVELS,
}: {
  rows: readonly UkLevelProgressRow[];
  totals: readonly UkLevelTotals[];
  floor: number;
  maxLevel?: number;
}): UkLevelResolution {
  const totalsByLevel = new Map(totals.map((entry) => [entry.level, entry]));
  const passedByLevel = new Map<number, number>();
  for (const row of rows) {
    const levelTotals = totalsByLevel.get(row.level);
    if (!levelTotals || row.kind !== gateKindFor(levelTotals) || !hasPassed(row)) continue;
    passedByLevel.set(row.level, (passedByLevel.get(row.level) ?? 0) + 1);
  }

  const start = Math.min(Math.max(UK_FIRST_LEVEL, floor), maxLevel);
  let level = start;

  for (let candidate = start; candidate <= maxLevel; candidate += 1) {
    const levelTotals = totalsByLevel.get(candidate);
    const need = levelTotals ? gateTotalFor(levelTotals) : 0;
    const has = passedByLevel.get(candidate) ?? 0;
    if (need === 0) {
      level = Math.min(candidate + 1, maxLevel);
      continue;
    }
    if (has / need >= UK_LEVEL_UNLOCK_THRESHOLD) {
      level = Math.min(candidate + 1, maxLevel);
      continue;
    }
    return { level: candidate, ratio: has / need, passed: has, total: need, gate: gateKindFor(levelTotals!) };
  }

  /* Every level cleared: the member is at the top with nothing outstanding. */
  return { level, ratio: 1, passed: 0, total: 0, gate: SUBJECT_TYPES.kanji };
}

/** Whether an item at `itemLevel` is open to a member standing at `currentLevel`. */
export function isUkLevelUnlocked({ itemLevel, currentLevel }: { itemLevel: number; currentLevel: number }): boolean {
  return itemLevel <= currentLevel;
}
