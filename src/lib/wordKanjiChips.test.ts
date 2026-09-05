import { describe, expect, it } from "vitest";

import { wordKanjiChips } from "./wordKanjiChips";

/*
 * The bug this exists for: on /kanji/午, 戊午 drew one chip and 壬午軍乱 drew
 * three of its four, because the enrichment behind the row only ever held the
 * kanji WaniKani teaches. 丙 is jōyō; 戊, 壬 and 庚 are jinmeiyō, which the
 * ladder deliberately never carries.
 */
describe("the characters a word is written with", () => {
  const NOON = { label: "午", meaning: "Noon", reading: "ご", wkLevel: 8 };

  it("draws every kanji, including the ones nothing knows about", () => {
    expect(wordKanjiChips("戊午", [NOON]).map((chip) => chip.label)).toEqual(["戊", "午"]);
    expect(wordKanjiChips("壬午軍乱", [NOON]).map((chip) => chip.label)).toEqual(["壬", "午", "軍", "乱"]);
  });

  it("carries the facts it has and says nothing for the rest", () => {
    const [unknown, known] = wordKanjiChips("戊午", [NOON]);
    expect(known).toEqual({ label: "午", meaning: "Noon", reading: "ご", level: 8, current: false });
    expect(unknown).toEqual({ label: "戊", meaning: null, reading: null, level: null, current: false });
  });

  it("leaves out the kana and keeps the reading order", () => {
    expect(wordKanjiChips("端午の節句", []).map((chip) => chip.label)).toEqual(["端", "午", "節", "句"]);
  });

  /* The row is the spelling, not a set: a repeated character is a chip each time. */
  it("draws a repeated character twice", () => {
    expect(wordKanjiChips("人人", []).map((chip) => chip.label)).toEqual(["人", "人"]);
  });

  /* Marked rather than missing: a link back to the page you are on does
     nothing, but dropping it makes the reader's count of the word come up
     short. */
  it("marks the character whose page this is", () => {
    expect(wordKanjiChips("戊午", [NOON], "午").map((chip) => chip.current)).toEqual([false, true]);
  });

  it("has nothing to draw for a word written in kana", () => {
    expect(wordKanjiChips("ひらがな", [])).toEqual([]);
  });
});
