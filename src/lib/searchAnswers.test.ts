import { describe, expect, it } from "vitest";

import { SEARCH_ANSWER_KINDS, needsRates, searchAnswers, type MoneyRates } from "./searchAnswers";

/** A day's rates against the euro, shaped like the ones the source publishes. */
const RATES: MoneyRates = {
  today: {
    base: "EUR",
    date: "2026-09-01",
    rates: { CAD: 1.6096, GBP: 0.8629, JPY: 185.63, USD: 1.159 },
  },
  past: [],
};

/** The same, with two of the five past points averaged and back. */
const RATES_WITH_PAST: MoneyRates = {
  today: RATES.today,
  past: [
    { lookback: "y1", table: { base: "EUR", date: "2025-09-02", rates: { CAD: 1.55, JPY: 170, USD: 1.1 } } },
    { lookback: "y20", table: { base: "EUR", date: "2006-09-02", rates: { CAD: 1.43, JPY: 148, USD: 1.28 } } },
  ],
};

const SOURCE = "European Central Bank";

describe("searchAnswers, on an era year", () => {
  it("answers with the Western year and the date in kanji", () => {
    const [answer] = searchAnswers("Heisei 3");
    expect(answer).toEqual({
      kind: SEARCH_ANSWER_KINDS.era,
      question: "Heisei 3",
      value: "1991",
      japanese: "平成3年",
      detail: "へいせい",
      attribution: null,
      history: null,
    });
  });

  /* A date typed in kanji still earns the Latin name; that is half the answer. */
  it("names the era in Latin letters for a query written in kanji", () => {
    const [answer] = searchAnswers("令和6年");
    expect(answer?.question).toBe("Reiwa 6");
    expect(answer?.value).toBe("2024");
    expect(answer?.japanese).toBe("令和6年");
  });

  it("answers nothing for a date that never happened", () => {
    expect(searchAnswers("Showa 65")).toEqual([]);
  });
});

describe("searchAnswers, on an amount of money", () => {
  it("answers a foreign amount in yen", () => {
    const [answer] = searchAnswers("23 EUR", RATES, SOURCE);
    expect(answer?.kind).toBe(SEARCH_ANSWER_KINDS.currency);
    expect(answer?.question).toBe("€23.00");
    expect(answer?.value).toBe("¥4,269");
    expect(answer?.japanese).toBe("4,269円");
    expect(answer?.detail).toBe("1 EUR = ¥185.63");
  });

  it("answers a yen amount in both of the site's currencies", () => {
    const [answer] = searchAnswers("1500円", RATES, SOURCE);
    expect(answer?.question).toBe("¥1,500");
    expect(answer?.value).toBe("CA$13.01 · $9.37");
    /* Already yen; repeating it under itself would say nothing. */
    expect(answer?.japanese).toBeNull();
    expect(answer?.detail).toBe("1 CAD = ¥115.33 · 1 USD = ¥160.16");
  });

  /*
   * A dollar sign is two questions here, so it gets two answers rather than
   * none. Guessing one would be wrong for half the people who typed it.
   */
  it("answers a bare dollar sign in each dollar it could have meant", () => {
    const answers = searchAnswers("$20", RATES, SOURCE);
    expect(answers).toHaveLength(2);
    expect(answers.map((answer) => answer.question)).toEqual(["CA$20.00", "$20.00"]);
    expect(answers.every((answer) => answer.kind === SEARCH_ANSWER_KINDS.currency)).toBe(true);
  });

  /* The form John asked for, which used to answer with nothing at all. */
  it("answers once when a code says which dollar was meant", () => {
    const answers = searchAnswers("$14.40 CAD", RATES, SOURCE);
    expect(answers).toHaveLength(1);
    expect(answers[0]?.question).toBe("CA$14.40");
    expect(answers[0]?.value).toBe("¥1,661");
  });

  /*
   * A rate is somebody's published number on a particular day, not arithmetic
   * the page can stand behind on its own, so it says whose and when.
   */
  it("carries the source and the day the rates were published", () => {
    const [answer] = searchAnswers("14.40 CAD", RATES, SOURCE);
    expect(answer?.attribution).toEqual({ source: SOURCE, asOf: "2026-09-01" });
  });

  /*
   * The rates are unreachable often enough to design for: the page still has
   * three catalogues to answer with, and a wrong number would be worse than
   * none.
   */
  it("answers nothing at all when the rates could not be had", () => {
    expect(searchAnswers("23 EUR", null, SOURCE)).toEqual([]);
  });

  it("answers nothing for a currency the day's rates do not carry", () => {
    expect(searchAnswers("500 SEK", RATES, SOURCE)).toEqual([]);
  });
});

describe("searchAnswers, on what the money used to be worth", () => {
  it("shows the same amount at each point that came back", () => {
    const [answer] = searchAnswers("23 EUR", RATES_WITH_PAST, SOURCE);
    expect(answer?.history?.columns).toEqual(["JPY"]);
    expect(answer?.history?.rows.map((row) => row.lookback)).toEqual(["y1", "y20"]);
    /* 23 EUR at ¥170 to the euro, a year ago. */
    expect(answer?.history?.rows[0]?.cells[0]?.value).toBe("¥3,910");
  });

  /* From then to now: ¥4,269 today against ¥3,910 a year ago. */
  it("measures the change from then to now", () => {
    const [answer] = searchAnswers("23 EUR", RATES_WITH_PAST, SOURCE);
    expect(answer?.history?.rows[0]?.cells[0]?.change).toBe("+9.2%");
  });

  it("gives a yen amount a column for each currency it is answered in", () => {
    const [answer] = searchAnswers("1500円", RATES_WITH_PAST, SOURCE);
    expect(answer?.history?.columns).toEqual(["CAD", "USD"]);
    expect(answer?.history?.rows[0]?.cells).toHaveLength(2);
    expect(answer?.history?.rows[0]?.cells[0]?.value).toMatch(/^CA\$/);
    expect(answer?.history?.rows[0]?.cells[1]?.value).toMatch(/^\$/);
  });

  /*
   * Five independent requests, so four rows of history is four rows of
   * history - but none at all is no table rather than an empty one.
   */
  it("shows no table when no past point came back", () => {
    const [answer] = searchAnswers("23 EUR", RATES, SOURCE);
    expect(answer?.value).toBe("¥4,269");
    expect(answer?.history).toBeNull();
  });

  it("drops a point whose averages do not carry the currency", () => {
    const rates: MoneyRates = {
      today: RATES.today,
      past: [
        { lookback: "y1", table: { base: "EUR", date: "2025-09-02", rates: { CAD: 1.55 } } },
        { lookback: "y5", table: { base: "EUR", date: "2021-09-02", rates: { JPY: 130 } } },
      ],
    };
    const [answer] = searchAnswers("23 EUR", rates, SOURCE);
    expect(answer?.history?.rows.map((row) => row.lookback)).toEqual(["y5"]);
  });
});

describe("needsRates", () => {
  /* Asked before the network is touched, so a search for a word never waits. */
  it("is true only for a query that names an amount", () => {
    expect(needsRates("23 EUR")).toBe(true);
    expect(needsRates("1500円")).toBe(true);
    expect(needsRates("$14.40 CAD")).toBe(true);
    expect(needsRates("$20")).toBe(true);
    expect(needsRates("morning")).toBe(false);
    expect(needsRates("Heisei 3")).toBe(false);
    expect(needsRates("日")).toBe(false);
  });
});

describe("searchAnswers, on everything else", () => {
  it("answers nothing for a query only the catalogues can answer", () => {
    expect(searchAnswers("morning", RATES, SOURCE)).toEqual([]);
    expect(searchAnswers("日", RATES, SOURCE)).toEqual([]);
    expect(searchAnswers("", RATES, SOURCE)).toEqual([]);
  });
});
