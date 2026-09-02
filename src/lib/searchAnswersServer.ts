import "server-only";

import { RATE_SOURCE_NAME, fetchAverageRateTable, fetchRateTable } from "./currencyRates";
import { lookbackWindows, toIsoDay } from "./moneyHistory";
import {
  needsRates,
  searchAnswers,
  type MoneyRates,
  type SearchAnswer,
} from "./searchAnswers";

export type { SearchAnswer } from "./searchAnswers";

/**
 * Today's rates and every past window, asked for together.
 *
 * In parallel rather than in turn, because they are six independent requests
 * and running them one after another would make the history cost six times
 * what it is worth. Each past window may fail on its own and take only its own
 * row with it; only today's failing takes the answer, since without it there
 * is nothing to compare a past to.
 */
async function fetchMoneyRates(history: boolean): Promise<MoneyRates | null> {
  const windows = history ? lookbackWindows(toIsoDay(new Date())) : [];

  const [today, ...past] = await Promise.all([
    fetchRateTable(),
    ...windows.map((window) => fetchAverageRateTable(window.start, window.end)),
  ]);

  if (!today) return null;

  return {
    today,
    past: windows.flatMap((window, index) => {
      const table = past[index];
      return table ? [{ lookback: window.lookback.id, table }] : [];
    }),
  };
}

/**
 * The answers a query earns, with anything they need fetched first.
 *
 * The history is asked for only where there is room to show it. The header
 * dropdown has none - it is ten rows under a search box - and asking for it
 * there would turn one cached request into six on a keystroke.
 *
 * The rates are asked for only when the query names an amount. Every other
 * search - which is almost all of them - reaches no further than the same
 * arithmetic the client could have done, so the common case costs nothing and
 * a currency API being slow cannot hold up a search for "water".
 */
export async function resolveSearchAnswers(
  query: string,
  options: { history?: boolean } = {},
): Promise<SearchAnswer[]> {
  const history = options.history ?? true;
  const rates = needsRates(query) ? await fetchMoneyRates(history) : null;
  return searchAnswers(query, rates, RATE_SOURCE_NAME);
}
