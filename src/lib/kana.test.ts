import { describe, expect, it } from "vitest";

import {
  hiraganaToKatakana,
  katakanaToHiragana,
  romajiToHiragana,
  searchQueryVariants,
} from "./kana";

describe("romajiToHiragana", () => {
  it("converts plain syllables", () => {
    expect(romajiToHiragana("watashi")).toBe("わたし");
    expect(romajiToHiragana("nichi")).toBe("にち");
    expect(romajiToHiragana("sensei")).toBe("せんせい");
  });

  it("handles digraphs in Hepburn and kunrei spellings", () => {
    expect(romajiToHiragana("kyou")).toBe("きょう");
    expect(romajiToHiragana("jitensha")).toBe("じてんしゃ");
    expect(romajiToHiragana("jitensya")).toBe("じてんしゃ");
    expect(romajiToHiragana("tyawan")).toBe("ちゃわん");
  });

  it("doubles consonants into っ, including t-before-ch", () => {
    expect(romajiToHiragana("gakkou")).toBe("がっこう");
    expect(romajiToHiragana("zasshi")).toBe("ざっし");
    expect(romajiToHiragana("matcha")).toBe("まっちゃ");
  });

  it("reads n as ん before consonants, at the end, and as n'", () => {
    expect(romajiToHiragana("shinbun")).toBe("しんぶん");
    expect(romajiToHiragana("shimbun")).toBe("しんぶん");
    expect(romajiToHiragana("onna")).toBe("おんな");
    expect(romajiToHiragana("hon")).toBe("ほん");
    expect(romajiToHiragana("honn")).toBe("ほん");
    expect(romajiToHiragana("kon'ya")).toBe("こんや");
    expect(romajiToHiragana("konya")).toBe("こにゃ");
  });

  it("folds macrons and long-vowel dashes", () => {
    expect(romajiToHiragana("rāmen")).toBe("らあめん");
    expect(romajiToHiragana("ra-men")).toBe("らーめん");
    expect(romajiToHiragana("kōhī")).toBe("こうひい");
  });

  it("returns null when any part is not romaji", () => {
    expect(romajiToHiragana("sun rise")).toBeNull();
    expect(romajiToHiragana("日")).toBeNull();
    expect(romajiToHiragana("xyz")).toBeNull();
    expect(romajiToHiragana("")).toBeNull();
  });
});

describe("script conversion", () => {
  it("maps hiragana to katakana and back", () => {
    expect(hiraganaToKatakana("わたし")).toBe("ワタシ");
    expect(katakanaToHiragana("ジュウ")).toBe("じゅう");
    expect(katakanaToHiragana("ラーメン")).toBe("らーめん");
  });
});

describe("searchQueryVariants", () => {
  it("gives a romaji query its kana spellings", () => {
    expect(searchQueryVariants("watashi")).toEqual(["watashi", "わたし", "ワタシ"]);
  });

  it("gives a kana query its sibling script", () => {
    expect(searchQueryVariants("わたし")).toEqual(["わたし", "ワタシ"]);
    expect(searchQueryVariants("ジュウ")).toEqual(["ジュウ", "じゅう"]);
  });

  it("leaves unconvertible queries alone", () => {
    expect(searchQueryVariants("house")).toContain("house");
    expect(searchQueryVariants("日")).toEqual(["日"]);
    expect(searchQueryVariants("sun rise")).toEqual(["sun rise"]);
  });

  it("never drops the raw query from the front", () => {
    expect(searchQueryVariants("nichi")[0]).toBe("nichi");
  });
});
