import { describe, expect, it } from "vitest";

import {
  LARGEST_JAPANESE_NUMBER,
  parseJapaneseNumber,
  readJapaneseNumber,
  writeJapaneseNumber,
} from "./japaneseNumbers";

/*
 * Japanese counts in ten-thousands. 一億二千万 is "one hundred million, two
 * thousand ten-thousands", and getting from there to 120,000,000 is the whole
 * skill this answers for.
 */
describe("reading a number written in Japanese", () => {
  it.each([
    ["一", 1],
    ["十", 10],
    ["十五", 15],
    ["二十四", 24],
    ["百", 100],
    ["三百二十一", 321],
    ["千", 1_000],
    ["一万", 10_000],
    ["二千二十六", 2_026],
    ["一億二千万", 120_000_000],
    ["三億五千万", 350_000_000],
    ["一兆", 1_000_000_000_000],
  ])("reads %s as %i", (text, value) => {
    expect(parseJapaneseNumber(text)).toBe(value);
  });

  /* A headline writes the awkward parts in digits and the magnitudes in kanji. */
  it.each([
    ["1億2000万", 120_000_000],
    ["5万", 50_000],
    ["3億5000万", 350_000_000],
    ["120000000", 120_000_000],
    ["1,200", 1_200],
    ["１２０", 120],
  ])("reads the mixed spelling %s as %i", (text, value) => {
    expect(parseJapaneseNumber(text)).toBe(value);
  });

  /*
   * Units descend or the text is not a number anybody wrote on purpose.
   * Reading 万億 as something would put a confident wrong answer on the page.
   */
  it.each(["万億", "十百", "百十百", "一二三", "ねこ", "", "  ", "12kg"])(
    "refuses %s",
    (text) => {
      expect(parseJapaneseNumber(text)).toBeNull();
    },
  );

  /* 〇 and 零 are both zero, and a run of digits keeps its place value. */
  it("reads both zeroes", () => {
    expect(parseJapaneseNumber("零")).toBe(0);
    expect(parseJapaneseNumber("〇")).toBe(0);
  });
});

describe("writing a number the Japanese way", () => {
  it.each([
    [0, "〇"],
    [1, "一"],
    [10, "十"],
    [24, "二十四"],
    [100, "百"],
    [321, "三百二十一"],
    [1_000, "千"],
    [10_000, "一万"],
    [2_026, "二千二十六"],
    [120_000_000, "一億二千万"],
    [350_000_000, "三億五千万"],
    [1_000_000_000_000, "一兆"],
  ])("writes %i as %s", (value, text) => {
    expect(writeJapaneseNumber(value)).toBe(text);
  });

  /* The two directions have to agree, or one of them is lying. */
  it.each([1, 8, 15, 24, 99, 100, 305, 1_000, 8_064, 10_000, 90_210, 1_000_000, 120_000_000, 350_000_000, 1_000_000_000_000])(
    "round-trips %i",
    (value) => {
      const written = writeJapaneseNumber(value);
      expect(written).not.toBeNull();
      expect(parseJapaneseNumber(written!)).toBe(value);
    },
  );

  /* Above the safe range JavaScript answers a digit or two out, which is worse than not answering. */
  it("declines what it cannot write exactly", () => {
    expect(writeJapaneseNumber(-1)).toBeNull();
    expect(writeJapaneseNumber(1.5)).toBeNull();
    expect(writeJapaneseNumber(1e17)).toBeNull();
    expect(LARGEST_JAPANESE_NUMBER).toBe(Number.MAX_SAFE_INTEGER);
  });
});

/*
 * The half a learner cannot get from the digits. 300 is さんびゃく, not
 * さんひゃく, and 八百 is はっぴゃく however confidently you know it is 800.
 */
describe("saying the number aloud", () => {
  it.each([
    [1, "いち"],
    [4, "よん"],
    [7, "なな"],
    [10, "じゅう"],
    [24, "にじゅうよん"],
    [100, "ひゃく"],
    [300, "さんびゃく"],
    [600, "ろっぴゃく"],
    [800, "はっぴゃく"],
    [1_000, "せん"],
    [3_000, "さんぜん"],
    [8_000, "はっせん"],
    [10_000, "いちまん"],
    [100_000_000, "いちおく"],
    [1_000_000_000_000, "いっちょう"],
    [120_000_000, "いちおくにせんまん"],
  ])("says %i as %s", (value, reading) => {
    expect(readJapaneseNumber(value)).toBe(reading);
  });

  it("says zero as the word people use for it", () => {
    expect(readJapaneseNumber(0)).toBe("ゼロ");
  });
});
