/**
 * What the same money was worth before.
 *
 * A converted price answers "how much is this", and the number on its own is
 * flat. The interesting thing about ¥1,500 is that it was CA$18 ten years ago
 * and is CA$13 now - the yen has moved a long way inside one learner's study
 * career, and a price carries that history whether or not anybody says so.
 *
 * Each point back is an average rather than a single day's rate. One day is
 * noise: a currency can move a percent on a Tuesday for reasons that have
 * nothing to do with the decade, and quoting that Tuesday as "five years ago"
 * would put a wobble into a line that is meant to show a trend. A month of
 * published rates around the date says the same thing more honestly.
 *
 * The arithmetic is here and the fetching is in `currencyRates`, so all of
 * this tests without a network.
 */

import type { RateTable } from "./money";

/**
 * How far back each row of the history looks.
 *
 * Years are counted as years rather than as 365 days, so "20 years ago" lands
 * on the same date twenty years back instead of five days adrift of it.
 */
export const LOOKBACKS = [
  { id: "d180", days: 180, years: 0 },
  { id: "y1", days: 0, years: 1 },
  { id: "y5", days: 0, years: 5 },
  { id: "y10", days: 0, years: 10 },
  { id: "y20", days: 0, years: 20 },
] as const;

export type Lookback = (typeof LOOKBACKS)[number];
export type LookbackId = Lookback["id"];

/**
 * How many days of published rates each point is averaged over.
 *
 * Thirty, which is about twenty-two working days once the ECB's weekends and
 * holidays are taken out - enough to bury a single day's move without
 * smearing across a season.
 */
export const AVERAGE_WINDOW_DAYS = 30;

/**
 * The first day the source has anything to say.
 *
 * The ECB's reference rates begin with the euro itself. A window reaching past
 * this is not a thin answer, it is no answer, so it is dropped rather than
 * averaged over whatever few days happen to fall inside.
 */
export const EARLIEST_RATE_DAY = "1999-01-04";

/** A day as the API writes it, `YYYY-MM-DD`, in UTC. */
export function toIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function shift(day: string, { days = 0, years = 0 }: { days?: number; years?: number }): string {
  const shifted = new Date(`${day}T00:00:00Z`);
  if (years) shifted.setUTCFullYear(shifted.getUTCFullYear() - years);
  if (days) shifted.setUTCDate(shifted.getUTCDate() - days);
  return toIsoDay(shifted);
}

/** The window a lookback averages, or null when it reaches past the data. */
export function lookbackWindow(
  today: string,
  lookback: Lookback,
): { start: string; end: string } | null {
  const end = shift(today, lookback);
  const start = shift(end, { days: AVERAGE_WINDOW_DAYS - 1 });
  return start < EARLIEST_RATE_DAY ? null : { start, end };
}

/** Every window worth asking for, given the day the search is happening. */
export function lookbackWindows(
  today: string,
): Array<{ lookback: Lookback; start: string; end: string }> {
  return LOOKBACKS.flatMap((lookback) => {
    const window = lookbackWindow(today, lookback);
    return window ? [{ lookback, ...window }] : [];
  });
}

/** A published day and what every currency was worth against the base on it. */
export type RateSeries = Readonly<Record<string, Readonly<Record<string, number>>>>;

/**
 * One table of averages from a run of daily ones.
 *
 * A currency missing on some days is averaged over the days it has rather than
 * dropped: the set the ECB publishes has changed over twenty years, and a
 * currency that joined partway through still has a real average for the part
 * it was there.
 */
export function averageRates(
  base: RateTable["base"],
  date: string,
  series: RateSeries,
): RateTable | null {
  const totals = new Map<string, { sum: number; days: number }>();

  for (const day of Object.values(series)) {
    for (const [code, value] of Object.entries(day)) {
      if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) continue;
      const held = totals.get(code) ?? { sum: 0, days: 0 };
      held.sum += value;
      held.days += 1;
      totals.set(code, held);
    }
  }

  if (totals.size === 0) return null;

  const rates: Record<string, number> = {};
  for (const [code, { sum, days }] of totals) rates[code] = sum / days;
  return { base, date, rates };
}

/**
 * How much more, or less, the amount is worth now than it was then.
 *
 * Measured from then to now, which is the direction the sentence runs: a row
 * saying ¥2,986 five years ago and +43% means the same euros buy 43% more yen
 * today. Under a tenth of a percent is written as no change rather than as
 * +0.0%, which reads like a rounding error being reported as news.
 */
export function formatChange(now: number, then: number): string | null {
  if (!Number.isFinite(now) || !Number.isFinite(then) || then <= 0) return null;

  const percent = ((now - then) / then) * 100;
  if (Math.abs(percent) < 0.1) return "0%";

  const places = Math.abs(percent) < 10 ? 1 : 0;
  return `${percent > 0 ? "+" : "−"}${Math.abs(percent).toFixed(places)}%`;
}
