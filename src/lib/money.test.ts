import { describe, expect, it } from "vitest";

import {
  CURRENCY_CODES,
  HOME_CURRENCIES,
  convertMoney,
  formatMoney,
  formatUnitRate,
  formatYenJapanese,
  isCurrencyCode,
  parseMoneyQuery,
  type RateTable,
} from "./money";

/** A day's rates against the euro, shaped like the ones the source publishes. */
const RATES: RateTable = {
  base: "EUR",
  date: "2026-09-01",
  rates: { AUD: 1.7825, CAD: 1.6096, GBP: 0.8629, JPY: 185.63, USD: 1.159 },
};

describe("parseMoneyQuery", () => {
  it("reads the two the ticket named", () => {
    expect(parseMoneyQuery("14.40 CAD")).toEqual([{ amount: 14.4, currency: "CAD" }]);
    expect(parseMoneyQuery("23 EUR")).toEqual([{ amount: 23, currency: "EUR" }]);
  });

  it("takes the currency on either side, spaced or not", () => {
    expect(parseMoneyQuery("EUR 23")).toEqual([{ amount: 23, currency: "EUR" }]);
    expect(parseMoneyQuery("23EUR")).toEqual([{ amount: 23, currency: "EUR" }]);
    expect(parseMoneyQuery("eur 23")).toEqual([{ amount: 23, currency: "EUR" }]);
  });

  it("reads a yen amount however it is written", () => {
    expect(parseMoneyQuery("1500 JPY")).toEqual([{ amount: 1500, currency: "JPY" }]);
    expect(parseMoneyQuery("¥1500")).toEqual([{ amount: 1500, currency: "JPY" }]);
    expect(parseMoneyQuery("￥1500")).toEqual([{ amount: 1500, currency: "JPY" }]);
    expect(parseMoneyQuery("1500円")).toEqual([{ amount: 1500, currency: "JPY" }]);
  });

  it("reads the symbols that name one currency and only one", () => {
    expect(parseMoneyQuery("€23")).toEqual([{ amount: 23, currency: "EUR" }]);
    expect(parseMoneyQuery("£10.50")).toEqual([{ amount: 10.5, currency: "GBP" }]);
  });

  /*
   * The dollar sign names the Canadian dollar and the American one, and this
   * site is written for both - so it answers in both rather than guessing.
   */
  it("reads a bare dollar sign as both dollars this site is written for", () => {
    expect(parseMoneyQuery("$20")).toEqual([
      { amount: 20, currency: "CAD" },
      { amount: 20, currency: "USD" },
    ]);
    expect(parseMoneyQuery("20$")).toEqual([
      { amount: 20, currency: "CAD" },
      { amount: 20, currency: "USD" },
    ]);
  });

  /* The form John asked for: the sign is punctuation once the code is there. */
  it("lets a code settle which dollar the sign meant", () => {
    expect(parseMoneyQuery("$14.40 CAD")).toEqual([{ amount: 14.4, currency: "CAD" }]);
    expect(parseMoneyQuery("$20 USD")).toEqual([{ amount: 20, currency: "USD" }]);
    expect(parseMoneyQuery("$1,234.56 AUD")).toEqual([{ amount: 1234.56, currency: "AUD" }]);
  });

  it("reads a currency named twice and agreeing with itself", () => {
    expect(parseMoneyQuery("¥1500 JPY")).toEqual([{ amount: 1500, currency: "JPY" }]);
  });

  /* Two names that disagree are a typo, and answering either would be a guess. */
  it("answers nothing when the two sides name different currencies", () => {
    expect(parseMoneyQuery("€23 USD")).toEqual([]);
    expect(parseMoneyQuery("CAD 20 JPY")).toEqual([]);
    /* A dollar sign is not a yen sign, however the code reads. */
    expect(parseMoneyQuery("$1,500 JPY")).toEqual([]);
  });

  /*
   * The formats a reader actually types. 500 yen and C$100 both answered with
   * nothing while 500¥ and 100 CAD converted, which is the wrong half.
   */
  it("reads the currency written as a word", () => {
    expect(parseMoneyQuery("500 yen")).toEqual([{ amount: 500, currency: "JPY" }]);
    expect(parseMoneyQuery("23 euros")).toEqual([{ amount: 23, currency: "EUR" }]);
    expect(parseMoneyQuery("10 pounds")).toEqual([{ amount: 10, currency: "GBP" }]);
    expect(parseMoneyQuery("5 quid")).toEqual([{ amount: 5, currency: "GBP" }]);
    expect(parseMoneyQuery("500 won")).toEqual([{ amount: 500, currency: "KRW" }]);
  });

  it("takes a plural without an entry of its own", () => {
    expect(parseMoneyQuery("23 euro")).toEqual(parseMoneyQuery("23 euros"));
    expect(parseMoneyQuery("10 rupee")).toEqual(parseMoneyQuery("10 rupees"));
  });

  it("reads the letters in front of a dollar sign", () => {
    expect(parseMoneyQuery("C$100")).toEqual([{ amount: 100, currency: "CAD" }]);
    expect(parseMoneyQuery("CA$100")).toEqual([{ amount: 100, currency: "CAD" }]);
    expect(parseMoneyQuery("US$20")).toEqual([{ amount: 20, currency: "USD" }]);
    expect(parseMoneyQuery("HK$300")).toEqual([{ amount: 300, currency: "HKD" }]);
    expect(parseMoneyQuery("R$50")).toEqual([{ amount: 50, currency: "BRL" }]);
  });

  /* A word can be two currencies just as a sign can. */
  it("answers a bare dollar word in both dollars, and a peso in the likelier one", () => {
    expect(parseMoneyQuery("100 dollars")).toEqual([
      { amount: 100, currency: "CAD" },
      { amount: 100, currency: "USD" },
    ]);
    expect(parseMoneyQuery("20 bucks")).toEqual([
      { amount: 20, currency: "CAD" },
      { amount: 20, currency: "USD" },
    ]);
    expect(parseMoneyQuery("100 pesos")).toEqual([{ amount: 100, currency: "MXN" }]);
  });

  /* A number beside an ordinary word is not a price. */
  it("leaves a number beside a word that is not money alone", () => {
    expect(parseMoneyQuery("chapter 3")).toEqual([]);
    expect(parseMoneyQuery("level 5")).toEqual([]);
    expect(parseMoneyQuery("grade 2")).toEqual([]);
    expect(parseMoneyQuery("Heisei 3")).toEqual([]);
  });

  /*
   * Japan counts in ten-thousands, and every price a learner meets is written
   * that way. Reading 400万円 as four hundred yen was wrong by four decimal
   * places on exactly the figures somebody moving there needs.
   */
  it("reads a price written the way Japan writes one", () => {
    expect(parseMoneyQuery("8万円")).toEqual([{ amount: 80_000, currency: "JPY" }]);
    expect(parseMoneyQuery("400万円")).toEqual([{ amount: 4_000_000, currency: "JPY" }]);
    expect(parseMoneyQuery("3,000万円")).toEqual([{ amount: 30_000_000, currency: "JPY" }]);
    expect(parseMoneyQuery("1億円")).toEqual([{ amount: 100_000_000, currency: "JPY" }]);
    expect(parseMoneyQuery("3千円")).toEqual([{ amount: 3_000, currency: "JPY" }]);
  });

  it("adds the units up, largest first", () => {
    expect(parseMoneyQuery("3億5000万円")).toEqual([{ amount: 350_000_000, currency: "JPY" }]);
    expect(parseMoneyQuery("5万3千円")).toEqual([{ amount: 53_000, currency: "JPY" }]);
    expect(parseMoneyQuery("1.5万円")).toEqual([{ amount: 15_000, currency: "JPY" }]);
  });

  /* 万億 is a typo, and a confident wrong figure is worse than no answer. */
  it("refuses units that climb rather than fall", () => {
    expect(parseMoneyQuery("5万億円")).toEqual([]);
    expect(parseMoneyQuery("万円")).toEqual([]);
  });

  it("reads the Latin shorthand for the same idea", () => {
    expect(parseMoneyQuery("20k yen")).toEqual([{ amount: 20_000, currency: "JPY" }]);
    expect(parseMoneyQuery("20K JPY")).toEqual([{ amount: 20_000, currency: "JPY" }]);
    expect(parseMoneyQuery("1.5m yen")).toEqual([{ amount: 1_500_000, currency: "JPY" }]);
    expect(parseMoneyQuery("$50k")).toEqual([
      { amount: 50_000, currency: "CAD" },
      { amount: 50_000, currency: "USD" },
    ]);
  });

  /* Without the lookahead the M of 20 MXN reads as a million. */
  it("does not read a currency code as a magnitude", () => {
    expect(parseMoneyQuery("20 MXN")).toEqual([{ amount: 20, currency: "MXN" }]);
    expect(parseMoneyQuery("100 BRL")).toEqual([{ amount: 100, currency: "BRL" }]);
  });

  /* A magnitude is not money on its own; it still needs a currency beside it. */
  it("still wants a currency named", () => {
    expect(parseMoneyQuery("20k")).toEqual([]);
    expect(parseMoneyQuery("5万")).toEqual([]);
  });

  it("reads a price written with a thousands comma", () => {
    expect(parseMoneyQuery("1,500円")).toEqual([{ amount: 1500, currency: "JPY" }]);
    expect(parseMoneyQuery("1,234,567 JPY")).toEqual([{ amount: 1234567, currency: "JPY" }]);
  });

  it("reads full-width digits, which a Japanese keyboard produces", () => {
    expect(parseMoneyQuery("１５００円")).toEqual([{ amount: 1500, currency: "JPY" }]);
  });

  it("answers nothing for a query that is not an amount", () => {
    expect(parseMoneyQuery("morning")).toEqual([]);
    expect(parseMoneyQuery("水")).toEqual([]);
    expect(parseMoneyQuery("23")).toEqual([]);
    expect(parseMoneyQuery("EUR")).toEqual([]);
    expect(parseMoneyQuery("23 XYZ")).toEqual([]);
    expect(parseMoneyQuery("")).toEqual([]);
  });

  it("refuses an amount that is not a price", () => {
    expect(parseMoneyQuery("0 JPY")).toEqual([]);
    expect(parseMoneyQuery("99999999999999999 JPY")).toEqual([]);
    /* A trillion yen is a budget line, not a typo. */
    expect(parseMoneyQuery("2兆円")).toEqual([{ amount: 2e12, currency: "JPY" }]);
  });
});

describe("convertMoney", () => {
  it("converts into yen through the published base", () => {
    const yen = convertMoney({ amount: 23, currency: "EUR" }, "JPY", RATES)!;
    expect(yen).toBeCloseTo(23 * 185.63, 6);
  });

  it("converts out of yen, which is the same sum backwards", () => {
    const cad = convertMoney({ amount: 1500, currency: "JPY" }, "CAD", RATES)!;
    expect(cad).toBeCloseTo((1500 / 185.63) * 1.6096, 6);
  });

  /*
   * Both sides divided by the base rather than one rate inverted: the source
   * quotes everything against the euro to five or six figures, and a rounded
   * three-figure inverse would cost a tenth of a percent for nothing.
   */
  it("crosses two currencies that are neither the base nor yen", () => {
    const gbp = convertMoney({ amount: 100, currency: "CAD" }, "GBP", RATES)!;
    expect(gbp).toBeCloseTo((100 / 1.6096) * 0.8629, 6);
  });

  it("leaves an amount alone when there is nothing to convert", () => {
    expect(convertMoney({ amount: 23, currency: "EUR" }, "EUR", RATES)).toBe(23);
  });

  it("answers nothing for a currency the day's rates do not carry", () => {
    expect(convertMoney({ amount: 5, currency: "ZAR" }, "JPY", RATES)).toBeNull();
    expect(convertMoney({ amount: 5, currency: "JPY" }, "ZAR", RATES)).toBeNull();
  });
});

describe("formatting", () => {
  /* CA$ against $, which is the whole reason a page can show both at once. */
  it("tells the two dollars apart", () => {
    expect(formatMoney(13.01, "CAD")).toBe("CA$13.01");
    expect(formatMoney(9.36, "USD")).toBe("$9.36");
  });

  it("writes yen the way yen is written, without cents", () => {
    expect(formatMoney(4269.49, "JPY")).toBe("¥4,269");
    expect(formatYenJapanese(4269.49)).toBe("4,269円");
  });

  it("prints a rate at the precision the rate needs", () => {
    expect(formatUnitRate("EUR", "JPY", RATES)).toBe("1 EUR = ¥185.63");
    expect(formatUnitRate("JPY", "CAD", RATES)).toBe("1 JPY = CA$0.00867");
  });

  it("answers nothing for a rate the day does not carry", () => {
    expect(formatUnitRate("ZAR", "JPY", RATES)).toBeNull();
  });
});

describe("the currency table", () => {
  it("knows the currencies the site is written for", () => {
    for (const code of ["JPY", "CAD", "USD", "EUR", "GBP"]) {
      expect(isCurrencyCode(code), code).toBe(true);
    }
    expect(isCurrencyCode("XYZ")).toBe(false);
  });

  it("answers a yen amount in both of the site's home currencies", () => {
    expect([...HOME_CURRENCIES]).toEqual(["CAD", "USD"]);
    for (const code of HOME_CURRENCIES) {
      expect(CURRENCY_CODES).toContain(code);
    }
  });
});
