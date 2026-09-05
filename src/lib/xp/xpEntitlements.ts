/**
 * What an XP rank buys you.
 *
 * The rank is earned by turning up, and this is what turning up is *for*
 * beyond a number going up: capacity. A new member may finish two games a day
 * for XP; somebody at rank 75 may finish six.
 *
 * **It is capped, and the cap is the point.** This is a compounding loop —
 * more games earn more XP, which buys more games — and left open it would
 * bend the whole economy toward whoever grinds hardest. The ceiling is six a
 * day, which is three times the starting allowance and no more: enough that
 * standing is worth something, not enough that a rank-90 member out-earns a
 * rank-10 member by an order of magnitude.
 *
 * The thresholds sit at ranks a member actually reaches — 10 inside a
 * fortnight, 25 and 50 within the first year — so the first unlock arrives
 * while somebody is still deciding whether this site is for them, rather than
 * years later when it would be a reward for having already stayed.
 *
 * `balanceSimulator.ts` models the effect: an entitlement that moved the
 * reference learner's three-year climb would be an entitlement priced wrong.
 */

export const XP_GAMES_PER_DAY_BASE = 2;
export const XP_GAMES_PER_DAY_CEILING = 6;

/** Rank at which each extra game a day unlocks. */
export const XP_GAME_UNLOCKS: readonly { rank: number; gamesPerDay: number }[] = [
  { rank: 1, gamesPerDay: 2 },
  { rank: 10, gamesPerDay: 3 },
  { rank: 25, gamesPerDay: 4 },
  { rank: 50, gamesPerDay: 5 },
  { rank: 75, gamesPerDay: XP_GAMES_PER_DAY_CEILING },
];

/** How many games a day count toward XP at this rank. */
export function gamesPerDayAt(xpLevel: number): number {
  let allowed = XP_GAMES_PER_DAY_BASE;
  for (const unlock of XP_GAME_UNLOCKS) {
    if (xpLevel >= unlock.rank) allowed = unlock.gamesPerDay;
  }
  return Math.min(allowed, XP_GAMES_PER_DAY_CEILING);
}

/** The next thing a rank unlocks, for telling a member what is coming. */
export function nextUnlockAfter(xpLevel: number): { rank: number; gamesPerDay: number } | null {
  return XP_GAME_UNLOCKS.find((unlock) => unlock.rank > xpLevel) ?? null;
}

/**
 * Every entitlement a rank carries, so a surface can list them without
 * knowing which ones exist. Games are the first; the shape is here so the
 * second does not arrive as a special case.
 */
export type XpEntitlements = { gamesPerDay: number };

export function entitlementsAt(xpLevel: number): XpEntitlements {
  return { gamesPerDay: gamesPerDayAt(xpLevel) };
}
