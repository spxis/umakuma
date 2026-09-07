import { describe, expect, it } from "vitest";

import { KANJI_LISTING_NOTES, KANJI_LISTING_NOTE_DISPLAY } from "./kanjiListing";
import { kanjiListingNote } from "./kanjiListingServer";

/*
 * The case that produced this: 七竈 on the 七 page drew a chip for 竈 with no
 * WK badge and no UN badge under it, and John asked whether that meant the
 * character was not even G1-6 or JLPT. It did. The row had no way to say so,
 * which is the bug - the levels were right and the silence was wrong.
 */
describe("a character no list teaches", () => {
  it("says so for 竈, which is on nothing", () => {
    /* KANJIDIC: grade null, jlptOld null, unranked for frequency. */
    expect(kanjiListingNote("竈")).toBe(KANJI_LISTING_NOTES.off);
  });

  it("separates the names list from no list at all", () => {
    /* 戊, 壬 and 庚 are jinmeiyō - the track the ladder deliberately skips -
       and they turn up in exactly these compounds: 戊午, 壬午軍乱. */
    expect(kanjiListingNote("戊")).toBe(KANJI_LISTING_NOTES.names);
    expect(kanjiListingNote("壬")).toBe(KANJI_LISTING_NOTES.names);
    expect(kanjiListingNote("庚")).toBe(KANJI_LISTING_NOTES.names);
  });

  it("says nothing about a character some list does teach", () => {
    /* On the ladder, so the levels speak for themselves. */
    expect(kanjiListingNote("七")).toBeNull();
    expect(kanjiListingNote("後")).toBeNull();
    /* Secondary jōyō, and on the old JLPT: taught, whatever our ladders did. */
    expect(kanjiListingNote("丙")).toBeNull();
  });

  it("is silent on kana and on anything that is not a character we know", () => {
    expect(kanjiListingNote("な")).toBe(KANJI_LISTING_NOTES.off);
    expect(kanjiListingNote("")).toBe(KANJI_LISTING_NOTES.off);
  });
});

describe("what the note prints", () => {
  it("gives every note a word and an explanation", () => {
    for (const note of Object.values(KANJI_LISTING_NOTES)) {
      const display = KANJI_LISTING_NOTE_DISPLAY[note];
      expect(display.label.length).toBeGreaterThan(0);
      /* The label is a chip; the sentence that explains it is the hover. */
      expect(display.label.length).toBeLessThan(12);
      expect(display.title.length).toBeGreaterThan(display.label.length);
    }
  });
});
