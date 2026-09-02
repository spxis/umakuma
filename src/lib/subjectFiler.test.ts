import { describe, expect, it } from "vitest";

import { LIST_ITEM_KINDS, SUBJECT_TYPES } from "./domainConstants";
import { canList, canTag, itemOf, itemsAfterToggle, listHolds, taggableIds, type FilerHit, type FilerList } from "./subjectFiler";

const water: FilerHit = { subjectType: SUBJECT_TYPES.kanji, glyph: "水", slug: "水", subjectId: 479 };
const jlptWater: FilerHit = { subjectType: SUBJECT_TYPES.kanji, glyph: "水", slug: null };
const wednesday: FilerHit = { subjectType: SUBJECT_TYPES.vocabulary, glyph: "水曜日", slug: "水曜日", subjectId: 2600 };
const leaf: FilerHit = { subjectType: SUBJECT_TYPES.radical, glyph: "leaf", slug: "leaf", subjectId: 8769 };
const unnamed: FilerHit = { subjectType: "prefecture", glyph: "東京", slug: null };

const week: FilerList = { id: "l1", name: "Week 1", items: [{ kind: LIST_ITEM_KINDS.kanji, key: "日" }, { kind: LIST_ITEM_KINDS.kanji, key: "月" }] };

describe("what a row may be filed as", () => {
  /* Trouble and Favourites are tags on a WaniKani subject; a JLPT row has no id to tag. */
  it("tags only rows the catalogue names", () => {
    expect(canTag(water)).toBe(true);
    expect(canTag(leaf)).toBe(true);
    expect(canTag(jlptWater)).toBe(false);
  });

  it("files a row as what it is: a kanji, a word, a radical by its slug", () => {
    expect(itemOf(water)).toEqual({ kind: LIST_ITEM_KINDS.kanji, key: "水", subjectId: 479 });
    expect(itemOf(jlptWater)).toEqual({ kind: LIST_ITEM_KINDS.kanji, key: "水", subjectId: null });
    /* A word goes in as a word, never as its kanji. */
    expect(itemOf(wednesday)).toEqual({ kind: LIST_ITEM_KINDS.vocabulary, key: "水曜日", subjectId: 2600 });
    expect(itemOf(leaf)).toEqual({ kind: LIST_ITEM_KINDS.radical, key: "leaf", subjectId: 8769 });
  });

  it("offers a saved list only to a row it can name", () => {
    expect(canList(jlptWater)).toBe(true);
    expect(canList(leaf)).toBe(true);
    expect(canList(unnamed)).toBe(false);
  });
});

describe("toggling a row on a saved list", () => {
  it("adds the row after what is there", () => {
    expect(listHolds(week, water)).toBe(false);
    expect(itemsAfterToggle(week, water).map((item) => item.key)).toEqual(["日", "月", "水"]);
  });

  it("takes the row out again when it is there", () => {
    const withWater: FilerList = { ...week, items: [...week.items, { kind: LIST_ITEM_KINDS.kanji, key: "水" }] };
    expect(listHolds(withWater, water)).toBe(true);
    expect(itemsAfterToggle(withWater, water).map((item) => item.key)).toEqual(["日", "月"]);
  });

  /* The kanji 日 on the list does not make the word 日 held. */
  it("tells a kanji on the list from the word written the same way", () => {
    const sun: FilerHit = { subjectType: SUBJECT_TYPES.vocabulary, glyph: "日", slug: "日", subjectId: 2500 };
    expect(listHolds(week, sun)).toBe(false);
  });
});

describe("what the tag store is asked about", () => {
  it("is each named subject, once, and no unnamed row", () => {
    expect(taggableIds([water, jlptWater, water, wednesday])).toEqual([479, 2600]);
  });
});
