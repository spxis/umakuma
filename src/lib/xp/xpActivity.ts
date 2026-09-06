import { resolveStreak, type StreakStanding } from "./xpStreak";

/**
 * What a member's XP history says about how they actually use the site.
 *
 * `XpEvent` was built to hold XP, and it turns out to be the best activity
 * record the site has. One row per account, per kind, per Vancouver day, with
 * an amount: that is a day-by-day account of what somebody did, in what
 * proportion, over their whole membership. Nothing else here knows that — the
 * study tables know reviews, the game tables know runs, and neither knows
 * about the other.
 *
 * So the streak comes out of it, and so does the shape of a member: whether
 * they are a reviewer or a games player, whether they come daily or in
 * weekend bursts, whether they have gone quiet. That last one is the useful
 * one for a family site — a member who has not appeared for a fortnight is
 * something worth knowing before they are gone for good.
 *
 * Derived, never stored. Days that exist cannot drift from days that happened,
 * where a counter incremented by something eventually can.
 */

export type XpDay = { dayKey: string; kind: string; amount: number };

export type XpActivity = {
  streak: StreakStanding;
  /** Distinct days with any activity at all. */
  daysActive: number;
  totalXp: number;
  /** XP by kind, largest first — what this member is actually here for. */
  byKind: { kind: string; amount: number; share: number }[];
  /** Their busiest day, for a sense of what a full session looks like. */
  bestDay: { dayKey: string; amount: number } | null;
  /** Mean XP across active days only, so a fortnight away does not flatten it. */
  averagePerActiveDay: number;
  /** Days since they last appeared. Null when they never have. */
  daysSinceLastActive: number | null;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((b - a) / MS_PER_DAY);
}

/**
 * @param protectedDays Days the member was away and not penalised for it, as
 *   `protectedDayKeys` returns them. They hold the chain and nothing else -
 *   they are not activity, so they never count toward `daysActive`, `totalXp`
 *   or the best day. Passing them matters because `resolveStreak` is what the
 *   member's own page reads, and a summary that left them out would show an
 *   admin a shorter streak than the member is being shown for the same
 *   account, which is the sort of disagreement nobody can debug from a
 *   screenshot.
 */
/**
 * The same summary, from totals rather than from every row.
 *
 * Everything `XpActivity` reports is a fold over two groupings - XP per day
 * and XP per kind - so a caller that can get those from the database does not
 * have to read the events themselves. `XpEvent` is one row per kind per day,
 * so a member three years in has thousands of them and the page that only
 * wanted a streak was reading all of them.
 *
 * `summariseXpActivity` below is this function with the fold done in memory,
 * kept for the callers that already hold the rows.
 */
export function summariseXpTotals(
  totals: {
    perDay: readonly { dayKey: string; amount: number }[];
    perKind: readonly { kind: string; amount: number }[];
  },
  today: string,
  protectedDays: readonly string[] = [],
): XpActivity {
  const streak = resolveStreak(
    totals.perDay.map((row) => row.dayKey),
    today,
    protectedDays,
  );

  const totalXp = totals.perDay.reduce((sum, row) => sum + row.amount, 0);

  const byKind = [...totals.perKind]
    .map((row) => ({ ...row, share: totalXp === 0 ? 0 : row.amount / totalXp }))
    .sort((a, b) => b.amount - a.amount);

  const best = [...totals.perDay].sort((a, b) => b.amount - a.amount)[0];
  const daysActive = totals.perDay.length;

  return {
    streak,
    daysActive,
    totalXp,
    byKind,
    bestDay: best ? { dayKey: best.dayKey, amount: best.amount } : null,
    averagePerActiveDay: daysActive === 0 ? 0 : Math.round(totalXp / daysActive),
    daysSinceLastActive: streak.lastActiveDay ? daysBetween(streak.lastActiveDay, today) : null,
  };
}

/** The summary from the raw events, for callers that already hold them. */
export function summariseXpActivity(
  rows: readonly XpDay[],
  today: string,
  protectedDays: readonly string[] = [],
): XpActivity {
  const perDay = new Map<string, number>();
  const perKind = new Map<string, number>();
  for (const row of rows) {
    perDay.set(row.dayKey, (perDay.get(row.dayKey) ?? 0) + row.amount);
    perKind.set(row.kind, (perKind.get(row.kind) ?? 0) + row.amount);
  }

  return summariseXpTotals(
    {
      perDay: [...perDay.entries()].map(([dayKey, amount]) => ({ dayKey, amount })),
      perKind: [...perKind.entries()].map(([kind, amount]) => ({ kind, amount })),
    },
    today,
    protectedDays,
  );
}

