/**
 * A member's streak, derived rather than stored.
 *
 * There is no streak column and there does not need to be one: `XpEvent`
 * already holds one row per account, per kind, per Vancouver day, so a day
 * somebody turned up is a day with rows. Counting consecutive day keys
 * backwards is the whole calculation.
 *
 * That is worth preferring to a column for the reason every derived value is:
 * a stored counter has to be incremented by something, and whatever increments
 * it eventually disagrees with what actually happened — a missed cron, a
 * timezone edge, a replayed request. Days that exist cannot drift from days
 * that happened.
 *
 * The cost is a query over a member's own event rows, which is bounded by the
 * days they have used the site, and the index on `(accountId, createdAt)`
 * covers it.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type StreakStanding = {
  /** Consecutive days up to and including today, or ending yesterday. */
  current: number;
  longest: number;
  /** The most recent day with any activity, or null for a member with none. */
  lastActiveDay: string | null;
  /** True when today already counts, so a member knows whether it is at risk. */
  activeToday: boolean;
};

/** `2026-09-04` -> the day before it, in the same shape. */
function previousDay(dayKey: string): string {
  const parsed = new Date(`${dayKey}T00:00:00Z`);
  return new Date(parsed.getTime() - MS_PER_DAY).toISOString().slice(0, 10);
}

/**
 * Counts back from today.
 *
 * A streak that ended yesterday is still a streak — the day is not over, and
 * telling somebody at breakfast that they have lost a hundred days because
 * they have not studied *yet* would be both wrong and the cruellest possible
 * moment to say it. It breaks when a whole day passes with nothing in it.
 */
export function resolveStreak(
  dayKeys: readonly string[],
  today: string,
  /**
   * Days the member was away and not penalised for it — a rest day spent
   * after the fact, or a day inside a vacation. They count as present for the
   * streak and for nothing else: they do not earn XP and they are not days of
   * study, they are days the streak was held for somebody.
   */
  protectedDays: readonly string[] = [],
): StreakStanding {
  const days = new Set([...dayKeys, ...protectedDays]);
  if (days.size === 0) return { current: 0, longest: 0, lastActiveDay: null, activeToday: false };

  const sorted = [...days].sort();
  /* Two different questions, and conflating them cost a day. **Covered**
     decides where the count starts - a rest day spent on today still holds the
     chain. **Studied** is what a member is told, because a protected day must
     never report that they are done when they have not started. */
  const coveredToday = days.has(today);
  const activeToday = new Set(dayKeys).has(today);

  let current = 0;
  let cursor = coveredToday ? today : previousDay(today);
  while (days.has(cursor)) {
    current += 1;
    cursor = previousDay(cursor);
  }

  let longest = 0;
  let run = 0;
  let previous: string | null = null;
  for (const day of sorted) {
    run = previous !== null && previousDay(day) === previous ? run + 1 : 1;
    previous = day;
    if (run > longest) longest = run;
  }

  /* The last day they actually studied, which is what "last active" means to
     a reader. A fortnight of vacation is not activity. */
  const studied = [...new Set(dayKeys)].sort();
  return { current, longest, lastActiveDay: studied[studied.length - 1] ?? null, activeToday };
}

/**
 * Which streak milestone a length has just reached, if any.
 *
 * Exact rather than "at least": the award fires on the day the streak becomes
 * 30, not on every day after it. The once-per-day key on `XpEvent` is a second
 * guard behind this rather than the only one.
 */
export function streakMilestoneReached(
  current: number,
  milestones: readonly { days: number; kind: string }[],
): { days: number; kind: string } | null {
  return milestones.find((milestone) => milestone.days === current) ?? null;
}
