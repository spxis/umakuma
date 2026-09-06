import { xpLevelFor } from "./xpCurve";

/**
 * When somebody crossed into the rank they hold.
 *
 * Not stored, and it does not need to be: `awardXp` writes the event and the
 * account total in one transaction, so `Account.xp` is the sum of its
 * `XpEvent` rows by construction and a replay cannot drift from it. Walking
 * the recent days backwards from the current total is therefore exact.
 *
 * **The resolution is the day, not the moment**, and that is a hard limit
 * rather than a choice: `XpEvent` is keyed `[accountId, kind, dayKey]` and
 * accumulates, so one row is a whole day of one kind of earning. It is also
 * exactly what SPX showed - its Promotion Date column read "Mon, May 19,
 * 2003", a date with no time - so the day is the target rather than a
 * compromise.
 *
 * **What happens if the premise ever breaks.** Verified on 2026-09-06: all ten
 * production accounts have `xp` exactly equal to the sum of their events. A
 * *seeded* account can differ - the local test user is given a total directly
 * so its profile looks lived-in without a year of rows behind it - and the
 * failure there is safe by construction: subtracting every known day off a
 * total the events cannot explain never drops the running figure into a lower
 * rank, so the walk reports no promotions rather than inventing one on the
 * wrong day. Under-reporting, never mis-reporting.
 *
 * Pure, and the same walk serves both the promotions board and the "promoted
 * on" line on a member's own page.
 */

export type XpPromotion = {
  /** The rank they crossed into. */
  level: number;
  /** The day they crossed, as a dayKey. */
  dayKey: string;
};

/**
 * The most recent promotion inside the days given, or null for none.
 *
 * `days` is that member's earning, newest first; `xp` is their total now. The
 * walk subtracts each day back off the total, and the moment the running
 * figure falls into a lower rank, the day just removed is the one they climbed
 * on.
 */
export function latestPromotion(
  xp: number,
  days: readonly { dayKey: string; amount: number }[],
): XpPromotion | null {
  const now = xpLevelFor(xp);
  let running = xp;

  for (const day of days) {
    const before = running - day.amount;
    if (xpLevelFor(before) < now) {
      return { level: now, dayKey: day.dayKey };
    }
    running = before;
  }

  /* They were already at this rank before the window opened. Not "no
     promotion ever" - just none inside the days we were handed. */
  return null;
}

/** Every promotion inside the days given, newest first. */
export function promotionsWithin(
  xp: number,
  days: readonly { dayKey: string; amount: number }[],
): XpPromotion[] {
  const found: XpPromotion[] = [];
  let running = xp;
  let level = xpLevelFor(xp);

  for (const day of days) {
    const before = running - day.amount;
    const levelBefore = xpLevelFor(before);
    /* A big day can carry somebody through more than one rank; each is its
       own promotion and they all happened on that day. */
    for (let crossed = level; crossed > levelBefore; crossed -= 1) {
      found.push({ level: crossed, dayKey: day.dayKey });
    }
    running = before;
    level = levelBefore;
  }

  return found;
}
