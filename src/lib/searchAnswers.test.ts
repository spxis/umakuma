import { describe, expect, it } from "vitest";

import type { RateTable } from "./money";
import { SEARCH_ANSWER_KINDS, needsRates, searchAnswers } from "./searchAnswers";

/** A day's rates against the euro, shaped like the ones the source publishes. */
const RATES: RateTable = {
  base: "EUR",
  date: "2026-09-01",
  rates: { CAD: 1.6096, GBP: 0.8629, JPY: 185.63, USD: 1.159 },
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

describe("needsRates", () => {
  /* Asked before the network is touched, so a search for a word never waits. */
  it("is true only for a query that names an amount", () => {
    expect(needsRates("23 EUR")).toBe(true);
    expect(needsRates("1500円")).toBe(true);
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
