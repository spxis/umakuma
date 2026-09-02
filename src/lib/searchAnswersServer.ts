import "server-only";

import { RATE_SOURCE_NAME, fetchRateTable } from "./currencyRates";
import { needsRates, searchAnswers, type SearchAnswer } from "./searchAnswers";

export type { SearchAnswer } from "./searchAnswers";

/**
 * The answers a query earns, with anything they need fetched first.
 *
 * The rates are asked for only when the query names an amount. Every other
 * search - which is almost all of them - reaches no further than the same
 * arithmetic the client could have done, so the common case costs nothing and
 * a currency API being slow cannot hold up a search for "water".
 */
export async function resolveSearchAnswers(query: string): Promise<SearchAnswer[]> {
  const rates = needsRates(query) ? await fetchRateTable() : null;
  return searchAnswers(query, rates, RATE_SOURCE_NAME);
}
