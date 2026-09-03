import { describe, expect, it } from "vitest";

import { parseEnglishNumber } from "./englishNumbers";

/*
 * A price spoken out loud, typed as it was heard. "five hundred yen" named an
 * amount as clearly as "500 yen" and answered with nothing, because the money
 * parser wanted digits.
 */
describe("a number written in words", () => {
  it.each([
    ["five", 5],
    ["nineteen", 19],
    ["twenty", 20],
    ["twenty five", 25],
    ["twenty-five", 25],
    ["hundred", 100],
    ["five hundred", 500],
    ["one hundred and fifty", 150],
    ["two thousand", 2_000],
    ["twenty thousand", 20_000],
    ["three hundred thousand", 300_000],
    ["one million", 1_000_000],
  ])("reads %s as %i", (text, value) => {
    expect(parseEnglishNumber(text)).toBe(value);
  });

  /*
   * The Japanese magnitudes in romaji, which is what a learner types long
   * before they can type 万.
   */
  it.each([
    ["5 man", 50_000],
    ["five man", 50_000],
    ["3 oku", 300_000_000],
    ["2 sen", 2_000],
    ["1 chou", 1_000_000_000_000],
  ])("reads %s as %i", (text, value) => {
    expect(parseEnglishNumber(text)).toBe(value);
  });

  /* Commas and joining words are how the language writes it, not part of it. */
  it("ignores the words that only join", () => {
    expect(parseEnglishNumber("a hundred and twenty")).toBe(120);
    expect(parseEnglishNumber("twenty thousand, five hundred")).toBe(20_500);
  });

  /*
   * Anything unknown makes the whole thing null. "five cats" is not five, and
   * a partial reading is a confident wrong answer.
   */
  it.each(["five cats", "cats", "", "  ", "yen", "5 5 kg"])("refuses %s", (text) => {
    expect(parseEnglishNumber(text)).toBeNull();
  });
});
