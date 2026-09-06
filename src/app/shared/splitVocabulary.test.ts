import { describe, expect, it } from "vitest";

import { LIST_ITEM_KINDS } from "@/lib/domainConstants";
import type { StudyListItemRef } from "@/lib/studyListRules";

import { kanjiInsideWords, kanjiToAddFromWords } from "./splitVocabulary";

/**
 * Taking a word apart into the kanji it is written with - the characters of
 * the word, which is what a member is looking at when they ask for this.
 */
describe("the kanji inside a word", () => {
  it("takes the characters in the order they are written", () => {
    expect(kanjiInsideWords(["成功"])).toEqual(["成", "功"]);
  });

  /* 借りる gives 借 and neither り nor る. */
  it("leaves the okurigana behind", () => {
    expect(kanjiInsideWords(["借りる"])).toEqual(["借"]);
  });

  it("says a kanji once however many words hold it", () => {
    expect(kanjiInsideWords(["自然", "自分"])).toEqual(["自", "然", "分"]);
  });

  it("has nothing to give from a word written in kana", () => {
    expect(kanjiInsideWords(["ください"])).toEqual([]);
  });
});

describe("what splitting would add", () => {
  const existing: StudyListItemRef[] = [
    { kind: LIST_ITEM_KINDS.vocabulary, key: "成功" },
    { kind: LIST_ITEM_KINDS.kanji, key: "成" },
  ];

  it("adds only the kanji the list has not got", () => {
    expect(kanjiToAddFromWords(["成功"], existing)).toEqual([{ kind: LIST_ITEM_KINDS.kanji, key: "功" }]);
  });

  /* Nothing to add is the case the button hides itself for. */
  it("adds nothing where the list already holds them all", () => {
    expect(kanjiToAddFromWords(["成"], existing)).toEqual([]);
  });

  /* The word itself is a vocabulary item; splitting must not add it as a kanji. */
  it("never adds the word back as a character", () => {
    const added = kanjiToAddFromWords(["大人"], []);
    expect(added.map((item) => item.key)).toEqual(["大", "人"]);
    expect(added.every((item) => item.kind === LIST_ITEM_KINDS.kanji)).toBe(true);
  });
});
