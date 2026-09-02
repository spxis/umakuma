import { describe, expect, it } from "vitest";

import { searchQueryVariants } from "./kana";
import { japaneseNumberVariants } from "./searchNumerals";

/**
 * Searching with digits.
 *
 * "1" found nothing at all. Not a near miss - nothing: the catalogues hold 一
 * and the word "One", and neither of them contains the character 1, so a
 * substring search over characters, readings and meanings had nothing to
 * match. It is a reasonable thing to type, and every dictionary a learner has
 * used answers it.
 *
 * The cases below are the ones a member actually types: a single digit, a
 * round number, a year, and a digit inside a phrase.
 */

describe("what a digit is asking for", () => {
  it("reads a digit as its kanji and its English", () => {
    expect(japaneseNumberVariants("1")).toEqual(expect.arrayContaining(["一", "one"]));
  });

  it("does the same for each of the nine", () => {
    const pairs: Array<[string, string]> = [
      ["2", "二"],
      ["3", "三"],
      ["4", "四"],
      ["5", "五"],
      ["6", "六"],
      ["7", "七"],
      ["8", "八"],
      ["9", "九"],
    ];
    for (const [digit, kanji] of pairs) {
      expect(japaneseNumberVariants(digit), digit).toContain(kanji);
    }
  });

  it("knows zero by both of its characters", () => {
    expect(japaneseNumberVariants("0")).toEqual(expect.arrayContaining(["零", "zero"]));
  });

  /*
   * The round ones are their own characters rather than digits strung
   * together: 10 is 十, not 一〇.
   */
  it("reads the round numbers as the characters they are", () => {
    expect(japaneseNumberVariants("10")).toContain("十");
    expect(japaneseNumberVariants("100")).toContain("百");
    expect(japaneseNumberVariants("1000")).toContain("千");
    expect(japaneseNumberVariants("10000")).toContain("万");
  });

  /*
   * Ten thousand is written 一万, and the character somebody typing it wants
   * is 万. Both are offered rather than one being chosen for them.
   */
  it("offers a round number spelled out as well as bare", () => {
    expect(japaneseNumberVariants("10000")).toEqual(expect.arrayContaining(["一万", "万"]));
  });

  /*
   * Above the round ones it spells the number out, because that is what the
   * catalogues hold: 24 is 二十四 and there is no single character for it.
   */
  it("spells out a number the language writes as several characters", () => {
    expect(japaneseNumberVariants("24")).toContain("二十四");
    expect(japaneseNumberVariants("11")).toContain("十一");
    expect(japaneseNumberVariants("2026")).toContain("二千二十六");
  });

  /*
   * The spelling of a compound number is not a subject anywhere - no catalogue
   * holds 五千 - so searching it exactly found nothing and the query looked
   * broken. The characters it is written with are all taught.
   */
  it("offers the characters a compound number is written with", () => {
    const variants = japaneseNumberVariants("5000");

    expect(variants).toContain("五千");
    expect(variants).toContain("五");
    expect(variants).toContain("千");
  });

  it("does not split a number written with one character", () => {
    expect(japaneseNumberVariants("1000")).toEqual(["千"]);
  });

  /*
   * A thousands comma is punctuation inside a number. Reading runs of digits,
   * 5,000 came apart into 5 and 000 and offered the kanji for five and for
   * zero, which is why searching a price found 零 first.
   */
  it("reads a number written with a thousands comma", () => {
    expect(japaneseNumberVariants("5,000")).toEqual(japaneseNumberVariants("5000"));
    expect(japaneseNumberVariants("5,000")).toContain("五千");
    expect(japaneseNumberVariants("1,234,567")).toEqual(japaneseNumberVariants("1234567"));
  });

  /* A comma between other digits lists two numbers; joining them invents a third. */
  it("leaves a comma that is not separating thousands", () => {
    expect(japaneseNumberVariants("1,2")).toEqual(japaneseNumberVariants("1 2"));
  });

  it("reads a full-width digit the same way", () => {
    expect(japaneseNumberVariants("１")).toContain("一");
  });

  /* A digit inside words is the number being asked about, so it is offered too. */
  it("finds the number inside a phrase", () => {
    expect(japaneseNumberVariants("2 people")).toContain("二");
  });

  it("offers nothing for text with no number in it", () => {
    expect(japaneseNumberVariants("water")).toEqual([]);
    expect(japaneseNumberVariants("")).toEqual([]);
  });

  /*
   * A number far past what anyone is looking a kanji up for. Spelling it out
   * would be a long string that matches nothing; better to say nothing.
   */
  it("gives up on a number no catalogue would hold", () => {
    expect(japaneseNumberVariants("123456789012")).toEqual([]);
  });
});

describe("the variants a search actually runs", () => {
  /* The end of it: this is what the catalogues are queried with. */
  it("carries the kanji into the query variants", () => {
    expect(searchQueryVariants("1")).toEqual(expect.arrayContaining(["1", "一", "one"]));
  });

  it("leaves a romaji query's own folding alone", () => {
    const variants = searchQueryVariants("watashi");
    expect(variants).toContain("わたし");
    expect(variants).toContain("ワタシ");
  });

  it("adds nothing to a query with no digits", () => {
    expect(searchQueryVariants("water")).toEqual(["water"]);
  });
});
