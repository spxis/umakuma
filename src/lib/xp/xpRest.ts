import { XP_RANKS } from "./xpCurve";

/**
 * Days off, and what a rank earns you.
 *
 * Two different problems, and they want different answers.
 *
 * A **rest day** is a day you missed. It is spent automatically, after the
 * fact, to keep a streak alive — you do not plan it, you simply do not lose a
 * hundred days because you had flu on a Tuesday. Duolingo's streak freeze does
 * this, and the reason it works is that it asks nothing of the member at the
 * moment they are least able to give it.
 *
 * **Vacation** is a stretch you know about in advance, and the streak is the
 * smaller half of it. The real damage of two weeks away is the review queue:
 * come back to four hundred items and the honest reaction is to stop. So
 * vacation freezes the SRS as well — every due date shifts forward by the
 * length of the absence, and a member returns to the queue they left rather
 * than to a punishment for having a life.
 *
 * Both are **earned by rank, not bought with XP**. Nothing here deducts from a
 * balance: the XP total is a record of what somebody has done and it would be
 * wrong to make it go down. A rank is standing, and standing is what buys
 * latitude — the further up you are, the more the site trusts you to be away.
 */

/**
 * The defaults, and only the defaults.
 *
 * These are what a fresh environment starts with; the live numbers come from
 * `SiteSetting` and are tuned from the admin screen, because generosity is
 * exactly the sort of thing you get wrong on paper and only learn by watching
 * somebody come back from a holiday. `xpRestSettings.ts` is the reader.
 *
 * They are deliberately generous. An allowance that runs out in February
 * teaches a member that the streak is a trap, and a member who believes the
 * streak is a trap stops looking at it — at which point it has stopped doing
 * the one job it had. Being too tight costs more than being too loose.
 */

/** Rest days a rank is allowed in a rolling year. */
export const XP_REST_DAY_ALLOWANCE: readonly { rank: number; days: number }[] = [
  /* A week from the very start. Two was the first draft and it was mean:
     a fortnight's holiday and one bad cold is a fortnight's holiday and one
     bad cold, not a character failing. */
  { rank: 1, days: 7 },
  { rank: 10, days: 12 },
  { rank: 25, days: 18 },
  { rank: 50, days: 26 },
  { rank: 75, days: 36 },
];

/** Whole weeks of vacation a rank may take in a rolling year. */
export const XP_VACATION_ALLOWANCE: readonly { rank: number; weeks: number }[] = [
  /* Available almost from the start now. The earlier draft held it back to
     rank 25 on the grounds that a new member has no queue worth freezing -
     true, and beside the point: the member most likely to be lost to a
     two-week absence is the new one, not the one with a year invested. */
  { rank: 5, weeks: 2 },
  { rank: 25, weeks: 4 },
  { rank: 50, weeks: 6 },
  { rank: 75, weeks: 8 },
  { rank: XP_RANKS, weeks: 10 },
];

export function restDaysAllowedAt(
  xpLevel: number,
  tiers: readonly { rank: number; days: number }[] = XP_REST_DAY_ALLOWANCE,
): number {
  let allowed = 0;
  for (const step of tiers) if (xpLevel >= step.rank) allowed = step.days;
  return allowed;
}

export function vacationWeeksAllowedAt(
  xpLevel: number,
  tiers: readonly { rank: number; weeks: number }[] = XP_VACATION_ALLOWANCE,
): number {
  let allowed = 0;
  for (const step of tiers) if (xpLevel >= step.rank) allowed = step.weeks;
  return allowed;
}

/** The next thing a rank unlocks in this area, for telling a member what is coming. */
export function nextRestUnlockAfter(xpLevel: number): { rank: number; days?: number; weeks?: number } | null {
  const nextRest = XP_REST_DAY_ALLOWANCE.find((step) => step.rank > xpLevel);
  const nextVacation = XP_VACATION_ALLOWANCE.find((step) => step.rank > xpLevel);
  if (!nextRest && !nextVacation) return null;
  if (!nextVacation) return { rank: nextRest!.rank, days: nextRest!.days };
  if (!nextRest) return { rank: nextVacation.rank, weeks: nextVacation.weeks };
  return nextRest.rank <= nextVacation.rank
    ? { rank: nextRest.rank, days: nextRest.days }
    : { rank: nextVacation.rank, weeks: nextVacation.weeks };
}

/* Six weeks, so a real trip fits inside one booking rather than being taken
   in instalments. Tunable like the rest. */
export const MAX_VACATION_DAYS_AT_ONCE = 42;

export type RestStanding = {
  restDaysAllowed: number;
  restDaysUsed: number;
  restDaysLeft: number;
  vacationWeeksAllowed: number;
  vacationDaysUsed: number;
  vacationDaysLeft: number;
  /** True while a vacation is running, so the site can say so rather than look broken. */
  onVacation: boolean;
};

export function restStanding({
  xpLevel,
  restDaysUsed,
  vacationDaysUsed,
  onVacation,
}: {
  xpLevel: number;
  restDaysUsed: number;
  vacationDaysUsed: number;
  onVacation: boolean;
}): RestStanding {
  const restDaysAllowed = restDaysAllowedAt(xpLevel);
  const vacationWeeksAllowed = vacationWeeksAllowedAt(xpLevel);
  return {
    restDaysAllowed,
    restDaysUsed,
    restDaysLeft: Math.max(0, restDaysAllowed - restDaysUsed),
    vacationWeeksAllowed,
    vacationDaysUsed,
    vacationDaysLeft: Math.max(0, vacationWeeksAllowed * 7 - vacationDaysUsed),
    onVacation,
  };
}
