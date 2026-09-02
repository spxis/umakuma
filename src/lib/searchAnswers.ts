/**
 * The answers a search can work out, as opposed to look up.
 *
 * Every result on the page so far comes from a catalogue: the query is matched
 * against characters, meanings and readings, and rows come back. Some queries
 * are not a request to find anything, though. "Heisei 3" is a request to be
 * told a number, and no catalogue holds it - the search answered with nothing
 * at all, which is the wrong answer to a question that has one.
 *
 * So an answer is a second kind of result, computed rather than found, shown
 * above the catalogues because it is what was asked for. The catalogue rows
 * still run underneath: 令和 is also a word somebody may want the reading of.
 *
 * Nothing here reaches the network. The rate table an amount needs is passed
 * in, so every converter is a function of its query and this whole module
 * tests without a server. `searchAnswersServer` is what fetches the rates.
 */

import {
  formatEraYearJapanese,
  formatEraYearRomaji,
  parseEraYear,
} from "./japaneseEras";
import {
  HOME_CURRENCIES,
  JPY,
  convertMoney,
  formatMoney,
  formatUnitRate,
  formatYenJapanese,
  parseMoneyQuery,
  type CurrencyCode,
  type MoneyAmount,
  type RateTable,
} from "./money";
import { formatChange, type LookbackId } from "./moneyHistory";

export const SEARCH_ANSWER_KINDS = {
  era: "era",
  currency: "currency",
} as const;

export type SearchAnswerKind = (typeof SEARCH_ANSWER_KINDS)[keyof typeof SEARCH_ANSWER_KINDS];

/** Who published the numbers an answer rests on, and when. */
export type AnswerAttribution = {
  source: string;
  /** The publication day, `YYYY-MM-DD`. */
  asOf: string;
};

/** Today's rates and the averaged past ones, as far back as they were had. */
export type MoneyRates = {
  today: RateTable;
  past: Array<{ lookback: LookbackId; table: RateTable }>;
};

/** What the amount was worth then, and how far it has moved since. */
export type AnswerHistoryCell = {
  value: string;
  /** Measured from then to now, so it reads as what has happened since. */
  change: string | null;
};

export type AnswerHistoryRow = {
  lookback: LookbackId;
  cells: AnswerHistoryCell[];
};

/**
 * The same amount at earlier points, which is where the interest is.
 *
 * One column per currency the answer is given in, so the yen direction - which
 * answers in two - carries two columns rather than needing a second shape.
 */
export type AnswerHistory = {
  columns: CurrencyCode[];
  rows: AnswerHistoryRow[];
};

export type SearchAnswer = {
  /** Which converter answered; the key a list renders by. */
  kind: SearchAnswerKind;
  /**
   * How the query was read, so a wrong reading is visible rather than
   * mysterious. Somebody who meant something else can see that at a glance
   * instead of wondering where the number came from.
   */
  question: string;
  /** The answer itself, the line the reader came for. */
  value: string;
  /** The same thing written in Japanese, or null when there is no such form. */
  japanese: string | null;
  /** A quiet line under the answer: a reading, a rate, a caveat. */
  detail: string | null;
  /**
   * The source behind the answer, for the answers that have one.
   *
   * An era year is arithmetic and answers for itself; a converted price is
   * somebody's published number on a particular day, and a page that showed it
   * without saying so would be claiming a precision it does not have.
   */
  attribution: AnswerAttribution | null;
  /** What the same amount was worth before, for the answers that have a past. */
  history: AnswerHistory | null;
};

/** The era converter, or nothing when the query is not a date. */
function eraAnswer(query: string): SearchAnswer | null {
  const found = parseEraYear(query);
  if (!found) return null;

  return {
    kind: SEARCH_ANSWER_KINDS.era,
    question: formatEraYearRomaji(found),
    value: String(found.westernYear),
    japanese: formatEraYearJapanese(found),
    detail: found.era.reading,
    attribution: null,
    history: null,
  };
}

/**
 * The money converter, or nothing when the query is not an amount.
 *
 * Two directions, because the question has two. An amount in any other
 * currency is a price somebody read and wants to understand, so it answers in
 * yen. A yen amount is the same question from the other side, and it names no
 * second currency - so it answers in both of the site's, rather than picking
 * one of the two countries it is written for.
 */
function currencyAnswer(money: MoneyAmount, rates: MoneyRates | null, source: string): SearchAnswer | null {
  if (!rates) return null;

  const today = rates.today;
  /* One column into yen, or both home currencies coming out of it. */
  const columns: CurrencyCode[] =
    money.currency === JPY ? [...HOME_CURRENCIES] : [JPY];

  const now = columns.map((currency) => convertMoney(money, currency, today));
  if (now.some((value) => value === null)) return null;
  const amounts = now as number[];

  const detail =
    money.currency === JPY
      ? columns.map((currency) => formatUnitRate(currency, JPY, today))
      : [formatUnitRate(money.currency, JPY, today)];

  return {
    kind: SEARCH_ANSWER_KINDS.currency,
    question: formatMoney(money.amount, money.currency),
    value: columns.map((currency, index) => formatMoney(amounts[index]!, currency)).join(" · "),
    /* Already yen coming out; repeating it under itself would say nothing. */
    japanese: money.currency === JPY ? null : formatYenJapanese(amounts[0]!),
    detail: detail.filter((line): line is string => line !== null).join(" · ") || null,
    attribution: { source, asOf: today.date },
    history: moneyHistory(money, columns, amounts, rates),
  };
}

/**
 * The same amount at each point back, and how far it has moved since.
 *
 * A point whose rates never arrived is left out rather than rendered blank:
 * the five lookbacks are five independent requests, and four rows of history
 * is four rows of history. Nothing at all means no table, not an empty one.
 */
function moneyHistory(
  money: MoneyAmount,
  columns: CurrencyCode[],
  amounts: number[],
  rates: MoneyRates,
): AnswerHistory | null {
  const rows: AnswerHistoryRow[] = [];

  for (const { lookback, table } of rates.past) {
    const cells: AnswerHistoryCell[] = [];
    for (const [index, currency] of columns.entries()) {
      const then = convertMoney(money, currency, table);
      if (then === null) break;
      cells.push({ value: formatMoney(then, currency), change: formatChange(amounts[index]!, then) });
    }
    if (cells.length === columns.length) rows.push({ lookback, cells });
  }

  return rows.length > 0 ? { columns, rows } : null;
}

/**
 * Whether a query is worth fetching exchange rates for.
 *
 * Asked before the network is touched, because the rates are only needed by
 * the one query in a thousand that names an amount, and a search for "water"
 * has no business waiting on a currency API.
 */
export function needsRates(query: string): boolean {
  return parseMoneyQuery(query).length > 0;
}

/**
 * Every answer a query earns, best first.
 *
 * A list rather than one answer because a query could name both a date and an
 * amount, and because a page rendering a list needs no second shape as
 * converters are added.
 */
export function searchAnswers(
  query: string,
  rates: MoneyRates | null = null,
  rateSource: string = "",
): SearchAnswer[] {
  const money = parseMoneyQuery(query).map((amount) => currencyAnswer(amount, rates, rateSource));

  return [eraAnswer(query), ...money].filter((answer): answer is SearchAnswer => answer !== null);
}
