/**
 * A hundred levels as a filter you can actually point at.
 *
 * The row was one hundred chips that would not wrap and scrolled sideways, so
 * a reader on level 74 saw levels 1 to 21 and had to drag for the rest. John,
 * twice: it should wrap like the JLPT filter, and it should group in tens with
 * a group opening on a click - "like a zoom" - the way the WaniKani filter's
 * range chips do.
 *
 * The WaniKani one cannot be reused for this. `groupStudyReviewLevelChips` is
 * a binary split - everything before the reader's recent band collapses into a
 * single "1-7", everything after into "8-17" - which is the right shape for a
 * queue that only holds levels somebody is actually reviewing. A curriculum is
 * every level whether or not anybody has reached it, so its groups are fixed
 * decades and any one of them can be the open one.
 *
 * Pure, so the arrangement is testable without a page: which decade is open,
 * which stay shut, and that no level goes missing between them.
 */

/** Ten. The whole point is that a hundred levels become ten things to read. */
export const LADDER_LEVEL_GROUP_SIZE = 10;

export type LadderLevelChip =
  /** One level, drawn because its group is the open one. */
  | { kind: "level"; level: number }
  /** A decade, shut. Pressing it opens that decade instead. */
  | { kind: "group"; startLevel: number; endLevel: number };

/**
 * The chips for a ladder of `total` levels with `openLevel`'s decade expanded.
 *
 * The open group is the one holding the level being read, never a separate
 * piece of state: a reader who is on level 74 wants the seventies open, and
 * anything else would be a control disagreeing with the page under it.
 */
export function ladderLevelChips(
  total: number,
  openLevel: number,
  size: number = LADDER_LEVEL_GROUP_SIZE,
): LadderLevelChip[] {
  const chips: LadderLevelChip[] = [];
  if (total < 1 || size < 1) return chips;

  for (let start = 1; start <= total; start += size) {
    const end = Math.min(start + size - 1, total);
    if (openLevel >= start && openLevel <= end) {
      for (let level = start; level <= end; level += 1) chips.push({ kind: "level", level });
    } else {
      chips.push({ kind: "group", startLevel: start, endLevel: end });
    }
  }

  return chips;
}

/**
 * The level a shut group opens on: its near edge, or where you already are.
 *
 * It used to be the first level unconditionally, argued for here on the
 * grounds that landing on 60 coming from 74 would drop the reader "at the far
 * end of the decade they just asked to see". That reads the row left to right
 * rather than as movement, and it is only right in one direction. Going up,
 * the first level *is* the near edge: 21-30 pressed from level 19 opens on 21,
 * the next level along, which is the increment. Going down it inverts - 11-20
 * pressed from level 21 opened on 11, nine levels further from the reader than
 * the level they had just left. John: "select the last item of that group,
 * which makes more sense than selecting the lowest item, since that is further
 * away than the level you were just on."
 *
 * So: the near edge, both directions. This was already the rule on the study
 * and level explorers, which each carried their own copy of it as
 * `boundaryLevelForGroup` - two identical private functions, and two other
 * rows that did it differently. One function now, because a row of level chips
 * should not land somewhere different depending on the page it is drawn on.
 *
 * `startLevel` and `endLevel` are the levels a caller can actually land on,
 * not necessarily the group's own bounds. A sparse row - History draws only
 * the levels with attempts behind it - passes the first and last it holds in
 * that group, or the reader lands on a level with nothing in it.
 */
export function groupOpensAtLevel(current: number | null, startLevel: number, endLevel: number): number {
  /* Nothing selected yet, so there is no direction to be near to. The highest
     is the most recent, which is where both explorers already put a reader. */
  if (current === null) return endLevel;
  if (current < startLevel) return startLevel;
  if (current > endLevel) return endLevel;
  /* Already inside it - the group is being reopened, so stay put. */
  return current;
}

/**
 * The near edge of a group whose levels are sparse, or null if it holds none.
 *
 * A curriculum has every level; a row built from what a member has actually
 * done does not. History draws a decade chip for 11-20 when the member has
 * attempts on 11, 12, 17 and 18 alone, so the decade's own bounds are not
 * places a reader can land - pressing it from level 25 has to reach 18, not
 * 20. Pure and separate from the component for the usual reason: which level a
 * press lands on is worth pinning without rendering a page to ask.
 */
export function sparseGroupOpensAt(
  current: number | null,
  startLevel: number,
  endLevel: number,
  present: ReadonlySet<number>,
): number | null {
  let first: number | null = null;
  let last: number | null = null;
  for (let level = startLevel; level <= endLevel; level += 1) {
    if (!present.has(level)) continue;
    if (first === null) first = level;
    last = level;
  }
  if (first === null || last === null) return null;
  return groupOpensAtLevel(current, first, last);
}

/** `groupOpensAtLevel` for a ladder chip, whose bounds are always real levels. */
export function ladderGroupOpensAt(
  chip: Extract<LadderLevelChip, { kind: "group" }>,
  current: number | null,
): number {
  return groupOpensAtLevel(current, chip.startLevel, chip.endLevel);
}
