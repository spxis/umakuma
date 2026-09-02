/**
 * Money in a search box, read and converted.
 *
 * A learner reading a Japanese page meets prices constantly - a 1,500円 lunch,
 * a 8,800円 textbook - and has no sense of whether that is cheap. The reverse
 * is the same question from the other side: somebody planning a trip knows
 * what they want to spend at home and not what it buys there.
 *
 * Everything here is arithmetic and formatting, with no idea where a rate came
 * from. The rate table is passed in, so this whole module runs in a test
 * without a network.
 */

/**
 * The currencies a query may name.
 *
 * The European Central Bank's daily reference set, which is what the rate
 * source publishes. A code outside it parses as nothing rather than as a
 * currency with no rate: the point of the list is that a query naming one of
 * these is worth asking about, and every other three-letter word is not.
 */
export const CURRENCY_CODES = [
  "AUD", "BRL", "CAD", "CHF", "CNY", "CZK", "DKK", "EUR", "GBP", "HKD",
  "HUF", "IDR", "ILS", "INR", "ISK", "JPY", "KRW", "MXN", "MYR", "NOK",
  "NZD", "PHP", "PLN", "RON", "SEK", "SGD", "THB", "TRY", "USD", "ZAR",
] as const;

export type CurrencyCode = (typeof CURRENCY_CODES)[number];

const CURRENCY_CODE_SET = new Set<string>(CURRENCY_CODES);

export function isCurrencyCode(value: string): value is CurrencyCode {
  return CURRENCY_CODE_SET.has(value);
}

export const JPY: CurrencyCode = "JPY";

/**
 * The currencies a yen amount is answered in.
 *
 * Typing 1500円 names no second currency, so the answer has to choose one, and
 * the site is built for Canadians and Americans - so it chooses both rather
 * than picking a side.
 */
export const HOME_CURRENCIES: readonly CurrencyCode[] = ["CAD", "USD"];

/**
 * The symbols that name one currency and only one.
 *
 * No dollar sign. It is the Canadian dollar, the American dollar, the
 * Australian, the Singaporean and the Hong Kong dollar, and the two at the
 * front of that list are the two this site is written for - so guessing which
 * one somebody meant would be wrong for half the people who typed it. A
 * dollar amount asks for its code, and every other query still works.
 */
const CURRENCY_SYMBOLS: Record<string, CurrencyCode> = {
  "¥": JPY,
  "￥": JPY,
  "円": JPY,
  "€": "EUR",
  "£": "GBP",
};

/** An amount of one currency, as it was typed. */
export type MoneyAmount = {
  amount: number;
  currency: CurrencyCode;
};

/**
 * Above this an amount is a typo or a joke rather than a price.
 *
 * A trillion of any currency converts fine; it just is not a question anybody
 * has, and the cap keeps a pasted phone number from being read as money.
 */
const LARGEST_AMOUNT = 1_000_000_000_000;

/** Full-width digits are what a Japanese keyboard produces. */
function toHalfWidthDigits(value: string): string {
  return value.replace(/[０-９．]/g, (char) =>
    char === "．" ? "." : String.fromCharCode(char.charCodeAt(0) - 0xfee0),
  );
}

/** The currency a token names, whether it is a code or a symbol. */
function currencyNamed(token: string): CurrencyCode | null {
  const symbol = CURRENCY_SYMBOLS[token];
  if (symbol) return symbol;

  const code = token.toUpperCase();
  return isCurrencyCode(code) ? code : null;
}

/*
 * A currency may lead or follow, because both are how it is written: €23 and
 * 23 EUR are the same amount, and so are ¥1500 and 1500円. The separator is
 * optional for the same reason - nobody types a space before 円.
 */
const CURRENCY_FIRST = /^([A-Za-z]{3}|[¥￥€£])\s*(\d+(?:\.\d+)?)$/;
const AMOUNT_FIRST = /^(\d+(?:\.\d+)?)\s*([A-Za-z]{3}|[¥￥€£円])$/;

/**
 * The amount a query names, or null when it does not name one.
 *
 * Commas are dropped before anything else is read: a price is written 1,500
 * as often as 1500, and treating the comma as punctuation rather than as part
 * of the number is what lets both be the same query.
 */
export function parseMoneyQuery(raw: string): MoneyAmount | null {
  const query = toHalfWidthDigits(String(raw ?? "").trim())
    .replace(/(\d),(?=\d{3}\b)/g, "$1")
    .replace(/\s+/g, " ");

  const match = CURRENCY_FIRST.exec(query) ?? AMOUNT_FIRST.exec(query);
  if (!match) return null;

  /* Whichever pattern matched, one group is the number and the other is not. */
  const [token, digits] = CURRENCY_FIRST.test(query)
    ? [match[1]!, match[2]!]
    : [match[2]!, match[1]!];

  const currency = currencyNamed(token);
  if (!currency) return null;

  const amount = Number(digits);
  if (!Number.isFinite(amount) || amount <= 0 || amount > LARGEST_AMOUNT) return null;

  return { amount, currency };
}

/** Rates against one base currency, and the day they were published. */
export type RateTable = {
  base: CurrencyCode;
  /** The publication day, `YYYY-MM-DD`. */
  date: string;
  /** How many of each currency one unit of the base buys. */
  rates: Readonly<Record<string, number>>;
};

/** How many units of the base one unit of the currency is worth. */
function perBase(table: RateTable, currency: CurrencyCode): number | null {
  if (currency === table.base) return 1;
  const rate = table.rates[currency];
  return typeof rate === "number" && rate > 0 ? rate : null;
}

/**
 * One currency in another, through the table's own base.
 *
 * Both sides are divided by the base rather than one being converted twice,
 * which keeps the answer as precise as the published numbers: the source
 * quotes everything against the euro to five or six figures, and inverting a
 * rounded three-figure rate would lose a tenth of a percent for no reason.
 */
export function convertMoney(
  money: MoneyAmount,
  to: CurrencyCode,
  table: RateTable,
): number | null {
  if (money.currency === to) return money.amount;

  const from = perBase(table, money.currency);
  const into = perBase(table, to);
  if (from === null || into === null) return null;

  return (money.amount / from) * into;
}

/**
 * The amount as its own currency writes it.
 *
 * `en-US` rather than the reader's locale on purpose: it is the one that
 * writes the Canadian dollar as CA$ and the American as $, which is the
 * distinction a page showing both has to make. A locale that assumed one of
 * them would print two identical dollar signs beside different numbers.
 */
export function formatMoney(amount: number, currency: CurrencyCode): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: "symbol",
  }).format(amount);
}

/** A yen amount as Japanese writes it: 4,269円. */
export function formatYenJapanese(amount: number): string {
  return `${Math.round(amount).toLocaleString("en-US")}円`;
}

/**
 * What one unit buys, for the line under the answer.
 *
 * Two decimals once a unit is worth a unit or more and five below that,
 * because the two directions need different precision: 1 EUR = ¥185.63 says
 * everything at two, while 1 JPY = CA$0.01 says nothing at all. The yen's own
 * default of no decimals is overridden for the same reason - a rate is not a
 * price, and ¥186 would hide the part of it that matters.
 */
export function formatUnitRate(from: CurrencyCode, to: CurrencyCode, table: RateTable): string | null {
  const one = convertMoney({ amount: 1, currency: from }, to, table);
  if (one === null) return null;

  const places = one >= 1 ? 2 : 5;
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: to,
    currencyDisplay: "symbol",
    minimumFractionDigits: places,
    maximumFractionDigits: places,
  }).format(one);

  return `1 ${from} = ${formatted}`;
}
