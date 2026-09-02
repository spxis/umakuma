import { describe, expect, it } from "vitest";

import { SUBJECT_TYPES } from "./domainConstants";
import { canList, canTag, charactersAfterToggle, listCharactersOf, listHolds, taggableIds, type FilerHit, type FilerList } from "./subjectFiler";

const water: FilerHit = { subjectType: SUBJECT_TYPES.kanji, glyph: "水", slug: "水", subjectId: 479 };
const jlptWater: FilerHit = { subjectType: SUBJECT_TYPES.kanji, glyph: "水", slug: null };
const wednesday: FilerHit = { subjectType: SUBJECT_TYPES.vocabulary, glyph: "水曜日", slug: "水曜日", subjectId: 2600 };
const arigatou: FilerHit = { subjectType: SUBJECT_TYPES.vocabulary, glyph: "ありがとう", slug: "ありがとう", subjectId: 2700 };
const leaf: FilerHit = { subjectType: SUBJECT_TYPES.radical, glyph: "leaf", slug: "leaf", subjectId: 8769 };

const week: FilerList = { id: "l1", name: "Week 1", characters: "日月火" };

describe("what a row may be filed as", () => {
  /* Trouble and Favourites are tags on a WaniKani subject; a JLPT row has no id to tag. */
  it("tags only rows the catalogue names", () => {
    expect(canTag(water)).toBe(true);
    expect(canTag(leaf)).toBe(true);
    expect(canTag(jlptWater)).toBe(false);
  });

  it("lists the kanji a row is written with, and nothing else", () => {
    expect(listCharactersOf(water)).toEqual(["水"]);
    expect(listCharactersOf(jlptWater)).toEqual(["水"]);
    expect(listCharactersOf(wednesday)).toEqual(["水", "曜", "日"]);
    /* A word in kana has no kanji to put on a sheet of kanji. */
    expect(listCharactersOf(arigatou)).toEqual([]);
    expect(listCharactersOf(leaf)).toEqual([]);
  });

  it("offers a saved list only where there is a kanji to add", () => {
    expect(canList(jlptWater)).toBe(true);
    expect(canList(arigatou)).toBe(false);
    expect(canList(leaf)).toBe(false);
  });
});

describe("toggling a row on a saved list", () => {
  it("adds the kanji the list is missing, after what is there", () => {
    expect(listHolds(week, water)).toBe(false);
    expect(charactersAfterToggle(week, water)).toBe("日月火水");
  });

  /* 日 is already there; only the two missing kanji are added, once each. */
  it("adds only what a word's kanji add", () => {
    expect(charactersAfterToggle(week, wednesday)).toBe("日月火水曜");
  });

  it("takes the row out again when every one of its kanji is on the list", () => {
    const withWater: FilerList = { ...week, characters: "日月火水" };
    expect(listHolds(withWater, water)).toBe(true);
    expect(charactersAfterToggle(withWater, water)).toBe("日月火");
  });

  it("counts a word as on the list only when all of its kanji are", () => {
    expect(listHolds({ ...week, characters: "水曜" }, wednesday)).toBe(false);
    expect(listHolds({ ...week, characters: "曜水日" }, wednesday)).toBe(true);
  });
});

describe("what the tag store is asked about", () => {
  it("is each named subject, once, and no unnamed row", () => {
    expect(taggableIds([water, jlptWater, water, wednesday])).toEqual([479, 2600]);
  });
});
