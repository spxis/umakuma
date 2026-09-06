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
 * The level a shut group opens on.
 *
 * Its first, rather than the nearest to where the reader is: a group chip
 * reading "51-60" that landed on 60 because the reader came from 74 would put
 * them at the far end of the decade they just asked to see.
 */
export function ladderGroupOpensAt(chip: Extract<LadderLevelChip, { kind: "group" }>): number {
  return chip.startLevel;
}
