import "server-only";

import { getVancouverDateKey } from "@/lib/dailySnapshot";
import { prisma } from "@/lib/prisma";

import { protectedDayKeys } from "./xpRestServer";
import { awardXp, awardXpQuietly } from "./xpServer";
import { resolveStreak, streakDayAwards, type StreakStanding } from "./xpStreak";

/**
 * Making the streak awards actually fire.
 *
 * `XP_BONUSES` has defined `sevenDayStreak`, `thirtyDayStreak`,
 * `hundredDayStreak` and `yearLongStreak` since the economy was written, and
 * not one of them had ever paid, because nothing computed a streak at the
 * moment an award was made. `resolveStreak` computes it now — from the days
 * `XpEvent` already holds, plus the rest and vacation days that hold a chain
 * across a gap — and this is where the two are joined.
 *
 * **`dailySignIn` is the latch, and that is the whole trick.** A streak is a
 * question about the member's entire history, which is the most expensive
 * question this file can ask, and asking it after every answered review would
 * be absurd — the answer cannot change twice in one day. `dailySignIn` is
 * capped and once-a-day, so awarding it returns a non-zero amount exactly once
 * per Vancouver day: on the day's first XP-earning action, and never again.
 * Everything after that costs one indexed read of `XpEvent` and returns.
 *
 * It also wires `dailySignIn` itself, which had never fired either. That is
 * not a widening of the economy: `simEconomy.ts` prices a sign-in into every
 * studied day, a `weeklyStreak` into every seventh, and the milestone at the
 * exact day it lands - the same three this file now pays. Wiring them makes
 * the site match the model the curve was calibrated against rather than
 * exceed it.
 *
 * Nothing here may fail the thing that earned it. A review that scored
 * correctly is a completed review whether or not its streak bonus landed, so
 * every failure is logged and swallowed.
 */

/** Where a member stands, derived from the days that exist rather than stored. */
export async function memberStreak(accountId: string, now = new Date()): Promise<StreakStanding> {
  const [days, protectedDays] = await Promise.all([
    prisma.xpEvent.findMany({ where: { accountId }, select: { dayKey: true }, distinct: ["dayKey"] }),
    protectedDayKeys(accountId),
  ]);
  return resolveStreak(days.map((row) => row.dayKey), getVancouverDateKey(now), protectedDays);
}

/* `streakDayAwards` lives in `xpStreak.ts` now, beside the streak it prices,
   so the cohort simulation can price a day without a database. Re-exported
   for the callers that knew it here. */
export { streakDayAwards };

/**
 * The day's first XP-earning action: sign the member in, then pay the streak.
 *
 * Returns what it awarded, for a caller that wants to say so. A caller that
 * does not is free to ignore it — nothing here is a condition of anything.
 */
export async function settleDailyStreak({
  accountId,
  now = new Date(),
}: {
  accountId: string;
  now?: Date;
}): Promise<number> {
  try {
    const signIn = await awardXp({ accountId, kind: "dailySignIn", now });
    /* Already signed in today, so the streak has already been settled today
       and cannot have moved since. This is the branch that runs on all but
       one action a day. */
    if (signIn.awarded <= 0) return 0;

    const standing = await memberStreak(accountId, now);
    const awards = streakDayAwards(standing.current);
    if (awards.length === 0) return signIn.awarded;

    return signIn.awarded + (await awardXpQuietly({ accountId, requests: awards, now }));
  } catch (problem) {
    console.error("Could not settle the day's streak", problem);
    return 0;
  }
}
