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

import { parseEnglishNumber } from "./englishNumbers";
import { readJapaneseNumber } from "./japaneseNumbers";

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

/** The symbols that name one currency and only one. */
const CURRENCY_SYMBOLS: Record<string, CurrencyCode> = {
  "¥": JPY,
  "￥": JPY,
  "円": JPY,
  "€": "EUR",
  "£": "GBP",
};

/**
 * What a token could mean: everything it may name, and what it means alone.
 *
 * Most tokens are one currency and the two lists are the same. The interesting
 * ones are not: a dollar sign is seven currencies, and "peso" is two.
 */
type CurrencyGuess = { family: readonly CurrencyCode[]; unaided: readonly CurrencyCode[] };

const one = (currency: CurrencyCode): CurrencyGuess => ({ family: [currency], unaided: [currency] });

/**
 * The signs and words that name a family rather than one currency.
 *
 * The dollar sign is seven of them, so it carries both the family and what it
 * means unaided. A code beside the sign picks from the family - `$14.40 CAD`
 * is Canadian and `$1,234 AUD` is Australian, because there the sign is only
 * punctuation - while a code outside it contradicts the sign and names
 * nothing. On its own the sign falls back to the two currencies this site is
 * written for and answers in both, which is the same choice the yen direction
 * already makes rather than picking a side for half the people who typed it.
 *
 * A peso is Mexican or Philippine and a krona is Swedish or Icelandic; each
 * falls back to the one a North American reader is likelier to have met.
 */
const DOLLAR_FAMILY: readonly CurrencyCode[] = ["AUD", "CAD", "HKD", "MXN", "NZD", "SGD", "USD"];

const DOLLARS: CurrencyGuess = { family: DOLLAR_FAMILY, unaided: HOME_CURRENCIES };

const AMBIGUOUS: Record<string, CurrencyGuess> = {
  $: DOLLARS,
  dollar: DOLLARS,
  buck: DOLLARS,
  peso: { family: ["MXN", "PHP"], unaided: ["MXN"] },
  krona: { family: ["ISK", "SEK"], unaided: ["SEK"] },
  krone: { family: ["DKK", "NOK"], unaided: ["DKK", "NOK"] },
  kroner: { family: ["DKK", "NOK"], unaided: ["DKK", "NOK"] },
  kronor: { family: ["SEK"], unaided: ["SEK"] },
};

/**
 * The words that say whose money it is without naming the unit.
 *
 * "500 Japanese yen" and "100 dollars CAD" each name one amount in three
 * tokens. The pattern took a single token on either side, so both answered
 * with nothing - and "Japanese yen" is how somebody who is not sure the reader
 * knows the sign writes it, which is exactly the reader this page is for.
 *
 * A nationality is a guess like any other and narrows by intersection: it
 * turns "dollars" from every dollar into one of them, and agrees harmlessly
 * with a unit that was already unambiguous.
 */
const NATIONALITIES: Record<string, CurrencyGuess> = {
  japanese: { family: [JPY], unaided: [JPY] },
  canadian: { family: ["CAD"], unaided: ["CAD"] },
  american: { family: ["USD"], unaided: ["USD"] },
  us: { family: ["USD"], unaided: ["USD"] },
  australian: { family: ["AUD"], unaided: ["AUD"] },
  british: { family: ["GBP"], unaided: ["GBP"] },
  european: { family: ["EUR"], unaided: ["EUR"] },
  chinese: { family: ["CNY"], unaided: ["CNY"] },
  korean: { family: ["KRW"], unaided: ["KRW"] },
};

/**
 * The currency a word names.
 *
 * Somebody reading a Japanese page and asking what 500 yen is worth types
 * "500 yen", not "500 JPY" and not "500¥" - the code is what a bank uses and
 * the sign is one keystroke most keyboards hide. A plural is the same word:
 * the lookup retries without a trailing s, so euros, pounds and rupees need no
 * entries of their own.
 */
const CURRENCY_WORDS: Record<string, CurrencyCode> = {
  yen: JPY,
  euro: "EUR",
  pound: "GBP",
  quid: "GBP",
  sterling: "GBP",
  franc: "CHF",
  yuan: "CNY",
  rmb: "CNY",
  won: "KRW",
  rupee: "INR",
  rupiah: "IDR",
  ringgit: "MYR",
  baht: "THB",
  zloty: "PLN",
  koruna: "CZK",
  forint: "HUF",
  leu: "RON",
  lira: "TRY",
  shekel: "ILS",
  rand: "ZAR",
  real: "BRL",
  reais: "BRL",
};

/**
 * The letters in front of a dollar sign that say whose dollar it is.
 *
 * C$100 is how a Canadian price is written wherever both dollars are in the
 * room, which is most places this site is read.
 */
const DOLLAR_PREFIXES: Record<string, CurrencyCode> = {
  c: "CAD",
  ca: "CAD",
  cad: "CAD",
  us: "USD",
  usd: "USD",
  a: "AUD",
  au: "AUD",
  aud: "AUD",
  nz: "NZD",
  nzd: "NZD",
  s: "SGD",
  sgd: "SGD",
  hk: "HKD",
  hkd: "HKD",
  mx: "MXN",
  mex: "MXN",
  mxn: "MXN",
  r: "BRL",
  brl: "BRL",
};

/** An amount of one currency, as it was typed. */
export type MoneyAmount = {
  amount: number;
  currency: CurrencyCode;
};

/**
 * Above this an amount is a typo rather than a figure.
 *
 * It was a trillion, which was fine until 兆 became readable: Japan's national
 * debt is quoted as 1,300兆円 and the cap answered it with nothing. Ten
 * quadrillion is past anything written as a price or a budget, and the guard
 * still costs nothing, since a number with no currency beside it was never
 * money in the first place.
 */
const LARGEST_AMOUNT = 1e16;

/** Full-width digits are what a Japanese keyboard produces. */
function toHalfWidthDigits(value: string): string {
  return value.replace(/[０-９．]/g, (char) =>
    char === "．" ? "." : String.fromCharCode(char.charCodeAt(0) - 0xfee0),
  );
}

/** A word, singular or plural, or nothing at all. */
function wordGuess(word: string): CurrencyGuess | null {
  const ambiguous = AMBIGUOUS[word];
  if (ambiguous) return ambiguous;

  const named = CURRENCY_WORDS[word];
  return named ? one(named) : null;
}

/**
 * What a token names, whether it is a sign, a code or a word.
 *
 * `null` is a token that names nothing, which makes the whole query not money:
 * `23 XYZ` is a number beside a word, and so is `chapter 3`.
 */
function currencyGuess(token: string): CurrencyGuess | null {
  const symbol = CURRENCY_SYMBOLS[token];
  if (symbol) return one(symbol);

  const word = token.toLowerCase();
  const ambiguous = AMBIGUOUS[word];
  if (ambiguous) return ambiguous;

  /* C$, US$, R$: the letters say whose dollar, so the sign settles nothing. */
  if (word.endsWith("$")) {
    const prefixed = DOLLAR_PREFIXES[word.slice(0, -1)];
    return prefixed ? one(prefixed) : null;
  }

  const code = token.toUpperCase();
  if (isCurrencyCode(code)) return one(code);

  const nationality = NATIONALITIES[word];
  if (nationality) return nationality;

  return wordGuess(word) ?? wordGuess(word.replace(/s$/, ""));
}

/*
 * A currency may lead or follow, because both are how it is written: €23 and
 * 23 EUR are the same amount, and so are ¥1500 and 1500円. The separator is
 * optional for the same reason - nobody types a space before 円. Both sides
 * are optional and both may be filled, because `$14.40 CAD` names its
 * currency twice; a query filling neither is a bare number and not money.
 */
const MONEY_TOKEN = String.raw`(?:[A-Za-z]{1,3}\$|\$|[A-Za-z]{2,8}|[¥￥€£円])`;

/**
 * How a number is made larger without writing the zeros.
 *
 * Japanese counts in ten-thousands rather than thousands, and every price a
 * learner meets is written that way: rent is 8万円, a salary 400万円, a flat
 * 3,000万円. Reading those as 8, 400 and 3,000 yen was not a small error - it
 * was wrong by four decimal places on exactly the numbers somebody moving to
 * Japan needs to understand. The Latin shorthand is the same idea in the
 * reader's own writing, so 20k yen is read too.
 */
const JAPANESE_UNITS: Record<string, number> = { "千": 1e3, "万": 1e4, "億": 1e8, "兆": 1e12 };
const LATIN_MAGNITUDES: Record<string, number> = { k: 1e3, m: 1e6, b: 1e9 };

/*
 * A magnitude letter must not be the start of a word: without the lookahead,
 * the M of `20 MXN` reads as a million and leaves XN behind as the currency.
 */
const MONEY_AMOUNT = String.raw`[\d.]+(?:[kKmMbB](?![A-Za-z]))?(?:\s*[千万億兆]\s*[\d.]*)*`;
/*
 * A side is up to three tokens, because that is how many an amount is written
 * with when nothing is taken for granted: "500 Japanese yen", "100 dollars
 * CAD". Every one of them still has to name or narrow a currency, so a number
 * beside two ordinary words is not money.
 */
const MONEY_SIDE = String.raw`${MONEY_TOKEN}(?:\s+${MONEY_TOKEN}){0,2}`;
const MONEY_QUERY = new RegExp(String.raw`^(${MONEY_SIDE})?\s*(${MONEY_AMOUNT})\s*(${MONEY_SIDE})?$`);

/**
 * The number an amount is written as, however it is written.
 *
 * Japanese units stack downward - 3億5000万 is three hundred and fifty
 * million - so each unit must be smaller than the one before it. 万億 is not a
 * number anybody wrote on purpose, and reading it as one would answer a typo
 * with a confident wrong figure.
 */
function readAmount(text: string): number | null {
  const compact = text.replace(/\s+/g, "");

  const latin = /^(\d+(?:\.\d+)?)([kKmMbB])$/.exec(compact);
  if (latin) return Number(latin[1]) * LATIN_MAGNITUDES[latin[2]!.toLowerCase()]!;

  if (!/[千万億兆]/.test(compact)) {
    return /^\d+(?:\.\d+)?$/.test(compact) ? Number(compact) : null;
  }

  let total = 0;
  let rest = compact;
  let previous = Infinity;

  while (rest.length > 0) {
    const part = /^(\d+(?:\.\d+)?)([千万億兆])?/.exec(rest);
    if (!part) return null;

    const unit = part[2] ? JAPANESE_UNITS[part[2]]! : 1;
    if (unit >= previous) return null;
    previous = unit;

    total += Number(part[1]) * unit;
    rest = rest.slice(part[0].length);
  }

  return total;
}

/**
 * The amounts a query names, which is usually none and sometimes two.
 *
 * Two when the query names a currency that is more than one currency: `$20`
 * is a Canadian and an American question at once, and both get answered.
 * Naming it on both sides narrows rather than repeats - the sides are
 * intersected, so `$14.40 CAD` is Canadian and `€23 USD` names nothing,
 * because a query that contradicts itself is a typo rather than a conversion.
 *
 * Commas are dropped before anything else is read: a price is written 1,500
 * as often as 1500, and treating the comma as punctuation rather than as part
 * of the number is what lets both be the same query.
 */
/**
 * The same query with a spelled-out amount written as digits.
 *
 * "five hundred yen" names a price as clearly as "500 yen" and parsed as
 * nothing, because the amount had to be digits. Rather than teach the money
 * pattern to read English, the words are turned into the number they are and
 * the pattern reads what it always did - so the currency rules, the limits and
 * the two-sided form all keep working without knowing this happened.
 *
 * Only where the result is still an amount: the rebuilt query has to match the
 * money pattern, so "five cats" stays "five cats" and answers nothing.
 */
function withSpelledAmountAsDigits(query: string): string {
  const tokens = query.split(" ");
  if (tokens.length < 2) return query;

  /*
   * A currency sits on either side and may be up to three tokens - "five
   * hundred Japanese yen" - so the words are whatever is left in the middle.
   */
  for (let start = 0; start <= 3; start += 1) {
    for (let end = tokens.length; end >= tokens.length - 3; end -= 1) {
      if (end - start < 1 || start >= end) continue;

      const middle = tokens.slice(start, end).join(" ");
      /* No letters means it is already digits, and nothing here to do. */
      if (!/[A-Za-z]/.test(middle)) continue;

      const value = parseEnglishNumber(middle);
      if (value === null || value <= 0) continue;

      const rebuilt = [...tokens.slice(0, start), String(value), ...tokens.slice(end)].join(" ");
      if (MONEY_QUERY.test(rebuilt)) return rebuilt;
    }
  }

  return query;
}

export function parseMoneyQuery(raw: string): MoneyAmount[] {
  const query = toHalfWidthDigits(String(raw ?? "").trim())
    .replace(/(\d),(?=\d{3}\b)/g, "$1")
    .replace(/\s+/g, " ");

  const match = MONEY_QUERY.exec(withSpelledAmountAsDigits(query));
  if (!match) return [];

  const [, before, digits, after] = match;
  const sides = [before, after]
    .filter((side): side is string => Boolean(side))
    .flatMap((side) => side.split(/\s+/).filter((token) => token.length > 0));
  if (sides.length === 0) return [];

  const guesses = sides.map(currencyGuess);
  if (guesses.some((guess) => guess === null)) return [];
  const named = guesses as CurrencyGuess[];

  /* Nothing narrowed the sign, so it means what it means on its own. */
  const unaided = named.every((guess) => guess.family.length > 1);
  const currencies = named
    .map((guess) => (unaided ? guess.unaided : guess.family))
    .reduce((kept, next) => kept.filter((currency) => next.includes(currency)));
  if (currencies.length === 0) return [];

  const amount = readAmount(digits);
  if (amount === null || !Number.isFinite(amount) || amount <= 0 || amount > LARGEST_AMOUNT) return [];

  return currencies.map((currency) => ({ amount, currency }));
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
 * How the amount is said, in kana.
 *
 * The yen's own reading is えん, and the number in front of it changes sound
 * the way every Japanese number does - 300 yen is さんびゃくえん. Null for an
 * amount too large to say exactly, where a confident wrong reading would be
 * worse than none.
 */
export function formatYenReading(amount: number): string | null {
  const said = readJapaneseNumber(Math.round(amount));
  return said ? `${said}えん` : null;
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
