import { describe, expect, it } from "vitest";

import { LIST_ITEM_KINDS } from "./domainConstants";
import { mergeSummary, unionListItems } from "./listMerge";
import { STUDY_LIST_LIMITS, type StudyListItemRef } from "./studyListRules";

const kanji = (key: string): StudyListItemRef => ({ kind: LIST_ITEM_KINDS.kanji, key });
const word = (key: string): StudyListItemRef => ({ kind: LIST_ITEM_KINDS.vocabulary, key });

const weekOne = [kanji("日"), kanji("月")];
const weekTwo = [kanji("月"), kanji("火")];

describe("two lists becoming one", () => {
  it("keeps the order they were chosen in, each item once", () => {
    expect(unionListItems([weekOne, weekTwo]).map((item) => item.key)).toEqual(["日", "月", "火"]);
    expect(unionListItems([weekTwo, weekOne]).map((item) => item.key)).toEqual(["月", "火", "日"]);
  });

  it("says how big the result is and how much was shared", () => {
    expect(mergeSummary([weekOne, weekTwo])).toEqual({ total: 3, shared: 1 });
    expect(mergeSummary([weekOne, [kanji("水")]])).toEqual({ total: 3, shared: 0 });
  });

  /* 上 the kanji and 上 the word are two items, here as everywhere. */
  it("tells a kanji from the word written the same way", () => {
    expect(unionListItems([[kanji("上")], [word("上")]])).toHaveLength(2);
  });

  it("stops at the cap one list holds", () => {
    const many = Array.from({ length: STUDY_LIST_LIMITS.items + 100 }, (_, index) => kanji(String.fromCodePoint(0x4e00 + index)));
    expect(unionListItems([many, weekOne])).toHaveLength(STUDY_LIST_LIMITS.items);
  });

  it("merges nothing into an empty list rather than throwing", () => {
    expect(unionListItems([])).toEqual([]);
  });
});
