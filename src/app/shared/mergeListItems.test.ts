import { describe, expect, it } from "vitest";

import { LIST_ITEM_KINDS } from "@/lib/domainConstants";
import type { StudyListItemRef } from "@/lib/studyListRules";

import { countNewItems, mergeListItems, withoutListItems } from "./mergeListItems";

const kanji = (key: string): StudyListItemRef => ({ kind: LIST_ITEM_KINDS.kanji, key });
const word = (key: string): StudyListItemRef => ({ kind: LIST_ITEM_KINDS.vocabulary, key });

describe("adding to a list that already has things in it", () => {
  /* The mistake this guards against: a save that replaced a list with the new items alone. */
  it("keeps what was there and adds what was chosen, in that order", () => {
    const merged = mergeListItems([kanji("日"), kanji("月")], [kanji("火"), kanji("水")]);
    expect(merged.map((item) => item.key)).toEqual(["日", "月", "火", "水"]);
  });

  it("adds nothing twice", () => {
    const merged = mergeListItems([kanji("日")], [kanji("日"), kanji("日"), kanji("月")]);
    expect(merged.map((item) => item.key)).toEqual(["日", "月"]);
  });

  /* 上 the kanji and 上 the word are two items; a list may hold both. */
  it("tells a kanji from the word written the same way", () => {
    const merged = mergeListItems([kanji("上")], [word("上")]);
    expect(merged).toHaveLength(2);
  });

  it("counts only what is new, for the button", () => {
    expect(countNewItems([kanji("日"), kanji("月")], [kanji("月"), kanji("火"), kanji("火")])).toBe(1);
    expect(countNewItems([], [])).toBe(0);
  });

  it("takes items out by kind and key", () => {
    expect(withoutListItems([kanji("上"), word("上")], [word("上")])).toEqual([kanji("上")]);
  });
});
