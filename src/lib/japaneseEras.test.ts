import { describe, expect, it } from "vitest";

import {
  JAPANESE_ERAS,
  formatEraYearJapanese,
  formatEraYearRomaji,
  parseEraYear,
  westernYearFor,
} from "./japaneseEras";

const REIWA = JAPANESE_ERAS.find((era) => era.kanji === "令和")!;
const SHOWA = JAPANESE_ERAS.find((era) => era.kanji === "昭和")!;

describe("westernYearFor", () => {
  /* An era's first year is year one, so the offset is one rather than none. */
  it("counts the first year as the year the era began", () => {
    expect(westernYearFor(REIWA, 1)).toBe(2019);
    expect(westernYearFor(SHOWA, 1)).toBe(1926);
  });

  it("works out the three the ticket named", () => {
    expect(westernYearFor(JAPANESE_ERAS[3]!, 3)).toBe(1991);
    expect(westernYearFor(SHOWA, 40)).toBe(1965);
    expect(westernYearFor(REIWA, 6)).toBe(2024);
  });

  /*
   * 昭和 ended partway through its 64th year and 平成 ended in its 31st, so
   * a higher number is not a late date - it is not a date at all, and
   * answering with the arithmetic would be a wrong answer rather than none.
   */
  it("refuses a year the era never reached", () => {
    expect(westernYearFor(SHOWA, 64)).toBe(1989);
    expect(westernYearFor(SHOWA, 65)).toBeNull();
    expect(westernYearFor(JAPANESE_ERAS[0]!, 46)).toBeNull();
    expect(westernYearFor(JAPANESE_ERAS[1]!, 16)).toBeNull();
    expect(westernYearFor(JAPANESE_ERAS[3]!, 32)).toBeNull();
  });

  it("keeps counting the era still running, within two digits", () => {
    expect(westernYearFor(REIWA, 99)).toBe(2117);
    expect(westernYearFor(REIWA, 100)).toBeNull();
  });

  it("refuses a year that is not one", () => {
    expect(westernYearFor(REIWA, 0)).toBeNull();
    expect(westernYearFor(REIWA, -1)).toBeNull();
    expect(westernYearFor(REIWA, 1.5)).toBeNull();
  });
});

describe("parseEraYear", () => {
  it("reads the three spellings the ticket named", () => {
    expect(parseEraYear("Heisei 3")?.westernYear).toBe(1991);
    expect(parseEraYear("Showa 40")?.westernYear).toBe(1965);
    expect(parseEraYear("令和6年")?.westernYear).toBe(2024);
  });

  it("does not mind the case, the spacing or the 年", () => {
    expect(parseEraYear("heisei 3")?.westernYear).toBe(1991);
    expect(parseEraYear("HEISEI3")?.westernYear).toBe(1991);
    expect(parseEraYear("  平成 3 年 ")?.westernYear).toBe(1991);
    expect(parseEraYear("平成3")?.westernYear).toBe(1991);
  });

  /* Whoever wrote Shōwa learned a different romanization, not another era. */
  it("takes every romanization of a long vowel", () => {
    expect(parseEraYear("Shouwa 40")?.westernYear).toBe(1965);
    expect(parseEraYear("Shōwa 40")?.westernYear).toBe(1965);
    expect(parseEraYear("Taisho 5")?.westernYear).toBe(1916);
    expect(parseEraYear("Taishou 5")?.westernYear).toBe(1916);
    expect(parseEraYear("Taishō 5")?.westernYear).toBe(1916);
  });

  /* 元年 is how a first year is written on anything official. */
  it("reads 元年 as the first year", () => {
    expect(parseEraYear("令和元年")?.westernYear).toBe(2019);
    expect(parseEraYear("平成元年")?.year).toBe(1);
  });

  /* A Japanese keyboard produces these, and they are the same digits. */
  it("reads full-width digits", () => {
    expect(parseEraYear("平成３年")?.westernYear).toBe(1991);
  });

  it("answers nothing for a query that is not a date", () => {
    expect(parseEraYear("morning")).toBeNull();
    expect(parseEraYear("water 3")).toBeNull();
    expect(parseEraYear("平成")).toBeNull();
    expect(parseEraYear("3")).toBeNull();
    expect(parseEraYear("")).toBeNull();
    expect(parseEraYear("Heisei 3 years")).toBeNull();
  });

  it("answers nothing for a year its era never reached", () => {
    expect(parseEraYear("Showa 65")).toBeNull();
    expect(parseEraYear("平成32年")).toBeNull();
  });

  it("carries the era it read, not just the number", () => {
    const found = parseEraYear("Heisei 3")!;
    expect(found.era.kanji).toBe("平成");
    expect(found.year).toBe(3);
  });
});

describe("formatting", () => {
  it("writes the date both ways", () => {
    const found = parseEraYear("Heisei 3")!;
    expect(formatEraYearJapanese(found)).toBe("平成3年");
    expect(formatEraYearRomaji(found)).toBe("Heisei 3");
  });

  it("writes the kanji form for a query that arrived in Latin letters", () => {
    expect(formatEraYearJapanese(parseEraYear("reiwa 6")!)).toBe("令和6年");
  });
});

describe("the era table", () => {
  it("runs from Meiji forwards with no gap between the eras", () => {
    expect(JAPANESE_ERAS[0]!.startYear).toBe(1868);
    for (let index = 1; index < JAPANESE_ERAS.length; index += 1) {
      const previous = JAPANESE_ERAS[index - 1]!;
      const era = JAPANESE_ERAS[index]!;
      /*
       * An era begins in the Western year the one before it ended in, because
       * the change happens partway through a year: 1989 is both 昭和64 and
       * 平成1, and 1926 is both 大正15 and 昭和1.
       */
      expect(westernYearFor(previous, previous.lastYear!)).toBe(era.startYear);
    }
  });

  it("leaves only the era still running open-ended", () => {
    const open = JAPANESE_ERAS.filter((era) => era.lastYear === null);
    expect(open.map((era) => era.kanji)).toEqual(["令和"]);
  });

  it("spells every era in lower case, so a query can be matched against it", () => {
    for (const era of JAPANESE_ERAS) {
      expect(era.spellings.length, era.romaji).toBeGreaterThan(0);
      for (const spelling of era.spellings) {
        expect(spelling, era.romaji).toBe(spelling.toLowerCase());
      }
      expect(era.spellings, era.romaji).toContain(era.romaji.toLowerCase());
    }
  });
});
