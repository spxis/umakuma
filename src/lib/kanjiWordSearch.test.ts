import { describe, expect, it } from "vitest";

import { mergeWordExamples, wordsSpelledWith } from "./kanjiWordSearch";

/*
 * John, arriving at 竃 from 七's page: "it doesn't have any Used In Words
 * entries like the page we came from! That's wrong!!! If you came from one
 * vocabulary word, then that other word will have the same vocabulary!!! to
 * go in reverse."
 *
 * A word belongs to every kanji in it. The examples are stored one row per
 * JLPT character, so the reverse direction has to be read out of other
 * people's rows - and a row that matched the blob is a candidate, not an
 * answer.
 */
const sevenRow = [
  { written: "七竃", pronounced: "ななかまど", gloss: "Japanese rowan" },
  { written: "七月", pronounced: "しちがつ", gloss: "July" },
];
const peakRow = [
  { written: "高嶺七竃", pronounced: "たかねななかまど", gloss: "Siberian mountain ash" },
  /* Stored under two characters; it must arrive once. */
  { written: "七竃", pronounced: "ななかまど", gloss: "Japanese rowan" },
];

describe("finding a word from the other end", () => {
  it("keeps the words actually spelled with the character", () => {
    expect(wordsSpelledWith([sevenRow, peakRow], "竃").map((word) => word.written)).toEqual([
      "七竃",
      "高嶺七竃",
    ]);
  });

  it("drops a row that matched on something other than the spelling", () => {
    /* The blob holds 竃 in a gloss, not in any word written with it. */
    const gloss = [{ written: "薪", pronounced: "まき", gloss: "firewood for a 竃" }];
    expect(wordsSpelledWith([gloss], "竃")).toEqual([]);
  });

  it("reads nothing out of a row that holds nothing", () => {
    expect(wordsSpelledWith([null, "not an array", {}], "竃")).toEqual([]);
  });
});

describe("the page's own words come first", () => {
  it("fills what is left with the ones found in reverse", () => {
    const merged = mergeWordExamples(sevenRow, peakRow, 12);
    expect(merged.map((word) => word.written)).toEqual(["七竃", "七月", "高嶺七竃"]);
  });

  it("never runs past the limit", () => {
    expect(mergeWordExamples(sevenRow, peakRow, 2)).toHaveLength(2);
    /* A page already full keeps exactly what its own row gave it. */
    expect(mergeWordExamples(sevenRow, peakRow, 2).map((word) => word.written)).toEqual(["七竃", "七月"]);
  });

  /* The limit gates what is added, never what the row already held: a page
     is not made shorter by looking for more. */
  it("adds nothing when there is no room, and drops nothing either", () => {
    expect(mergeWordExamples(sevenRow, peakRow, 0)).toEqual(sevenRow);
  });
});
