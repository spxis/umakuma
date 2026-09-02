import "server-only";

import { CURRENCY_CODES, isCurrencyCode, type CurrencyCode, type RateTable } from "./money";
import { averageRates } from "./moneyHistory";

/**
 * Where the exchange rates come from.
 *
 * Frankfurter, which republishes the European Central Bank's daily reference
 * rates. It was chosen for the thing that rules most of the free rate APIs
 * out: no key, no account, and no request budget to run down. The others hand
 * out a few hundred calls a month against a key that has to be kept secret,
 * and a search box is exactly the surface that would spend them - a member
 * typing a price is one request, and a member typing it slowly is several.
 *
 * The rates are a daily publication, so they are fetched at most once every
 * six hours and shared by every reader through Next's data cache. Nothing here
 * is per-member, and nothing about a query is sent: the request asks for every
 * rate against the euro and the arithmetic happens here.
 *
 * The ECB publishes on working days at about 16:00 CET, so a weekend answers
 * with Friday's numbers. That is why the answer prints the date it is quoting
 * rather than implying the rate is live.
 */

const RATES_ORIGIN = "https://api.frankfurter.dev/v1";

const RATES_URL = `${RATES_ORIGIN}/latest?base=EUR`;

/** The base every rate is quoted against, which is what the source publishes. */
const RATE_BASE: CurrencyCode = "EUR";

/** How long a published set of rates is served before it is asked for again. */
const RATE_TTL_SECONDS = 60 * 60 * 6;

/** How long to wait before the answer is not worth holding the page for. */
const RATE_TIMEOUT_MS = 2_500;

/** Who to credit, and what the reader is being told the numbers are. */
export const RATE_SOURCE_NAME = "European Central Bank";

type FrankfurterResponse = {
  base?: string;
  date?: string;
  rates?: Record<string, unknown>;
};

/** Only the currencies this site knows about, and only real positive rates. */
function readRates(payload: FrankfurterResponse): Record<string, number> {
  const rates: Record<string, number> = {};
  for (const [code, value] of Object.entries(payload.rates ?? {})) {
    if (!isCurrencyCode(code)) continue;
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) continue;
    rates[code] = value;
  }
  return rates;
}

/**
 * Today's rates, or null when they could not be had.
 *
 * Null rather than a throw, and null rather than a stale guess. A search page
 * is not a currency converter with one job: if the rates cannot be reached the
 * page still has three catalogues to answer with, and the money line is simply
 * absent. Printing yesterday's number without saying so would be worse than
 * printing nothing, and printing an error where an answer goes would push the
 * results down for a failure the reader can do nothing about.
 */
export async function fetchRateTable(): Promise<RateTable | null> {
  try {
    const response = await fetch(RATES_URL, {
      next: { revalidate: RATE_TTL_SECONDS },
      signal: AbortSignal.timeout(RATE_TIMEOUT_MS),
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as FrankfurterResponse;
    if (payload.base !== RATE_BASE || typeof payload.date !== "string") return null;

    const rates = readRates(payload);
    /* One currency back is a broken answer dressed as a working one. */
    if (Object.keys(rates).length < CURRENCY_CODES.length / 2) return null;

    return { base: RATE_BASE, date: payload.date, rates };
  } catch {
    return null;
  }
}

type FrankfurterSeriesResponse = {
  base?: string;
  start_date?: string;
  end_date?: string;
  rates?: Record<string, unknown>;
};

/**
 * A past window's rates, averaged into one table.
 *
 * Held far longer than today's, because a window that has already closed will
 * never say anything different. Only its ends move, once a day, as the day the
 * search happens moves - so a day is the natural life of the answer, and every
 * reader asking about the past on the same day shares one request.
 */
const PAST_TTL_SECONDS = 60 * 60 * 24;

/**
 * The average rate over one past window, or null when it could not be had.
 *
 * A missing window is a missing row rather than a missing answer. The five
 * lookbacks are independent requests and any of them may fail on its own; what
 * comes back is however many of them arrived.
 */
export async function fetchAverageRateTable(
  start: string,
  end: string,
): Promise<RateTable | null> {
  try {
    const response = await fetch(`${RATES_ORIGIN}/${start}..${end}?base=${RATE_BASE}`, {
      next: { revalidate: PAST_TTL_SECONDS },
      signal: AbortSignal.timeout(RATE_TIMEOUT_MS),
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as FrankfurterSeriesResponse;
    if (payload.base !== RATE_BASE) return null;

    const series: Record<string, Record<string, number>> = {};
    for (const [day, quotes] of Object.entries(payload.rates ?? {})) {
      if (!quotes || typeof quotes !== "object") continue;
      series[day] = readRates({ rates: quotes as Record<string, unknown> });
    }

    return averageRates(RATE_BASE, payload.end_date ?? end, series);
  } catch {
    return null;
  }
}
