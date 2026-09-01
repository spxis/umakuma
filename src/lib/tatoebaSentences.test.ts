import { describe, expect, it } from "vitest";

import {
  SENTENCE_LIMIT,
  SENTENCE_MAX_LIMIT,
  TATOEBA_ATTRIBUTION,
  dedupeSentences,
  sentenceHref,
  sentenceShape,
} from "./tatoebaSentences";

describe("Tatoeba attribution", () => {
  /*
   * The corpus is CC BY, so naming Tatoeba is a licence condition rather than
   * a courtesy - the same guard the stroke and dictionary data carry.
   */
  it("names the source and the licence", () => {
    expect(TATOEBA_ATTRIBUTION.source).toBe("Tatoeba");
    expect(TATOEBA_ATTRIBUTION.licence).toContain("CC BY");
    expect(TATOEBA_ATTRIBUTION.url).toContain("tatoeba.org");
    expect(TATOEBA_ATTRIBUTION.licenceUrl).toContain("creativecommons.org");
  });
});

describe("sentenceHref", () => {
  it("points at the sentence on Tatoeba, so a credit can be followed", () => {
    expect(sentenceHref(1297)).toBe("https://tatoeba.org/sentences/show/1297");
  });
});

describe("sentence limits", () => {
  it("shows a few examples rather than a reading list", () => {
    expect(SENTENCE_LIMIT).toBeLessThanOrEqual(5);
    expect(SENTENCE_MAX_LIMIT).toBeGreaterThan(SENTENCE_LIMIT);
  });
});

describe("dedupeSentences", () => {
  /*
   * Tatoeba holds "水をくれ！" and "水をくれ。" as separate contributions and
   * scores them identically, so a page showing three examples spent two of
   * them saying the same thing.
   */
  it("treats sentences that differ only in punctuation as one", () => {
    const kept = dedupeSentences(
      [
        { japanese: "水をくれ！", english: "Give me water!" },
        { japanese: "水をくれ。", english: "Give me water." },
        { japanese: "水をください。", english: "Water, please." },
      ],
      3,
    );
    expect(kept.map((row) => row.japanese)).toEqual(["水をくれ！", "水をください。"]);
  });

  it("keeps the first phrasing, which is the easiest one after the sort", () => {
    const kept = dedupeSentences(
      [
        { japanese: "私も。", english: "So do I." },
        { japanese: "私も", english: "Me too" },
      ],
      2,
    );
    expect(kept).toHaveLength(1);
    expect(kept[0]!.english).toBe("So do I.");
  });

  it("stops at the limit", () => {
    const many = Array.from({ length: 10 }, (_, index) => ({ japanese: `文${index}`, english: "x" }));
    expect(dedupeSentences(many, 3)).toHaveLength(3);
  });
});

describe("sentenceShape", () => {
  it("ignores the punctuation that makes two contributions look different", () => {
    expect(sentenceShape("水をくれ！")).toBe(sentenceShape("水をくれ。"));
    expect(sentenceShape("水をくれ")).not.toBe(sentenceShape("水をください"));
  });
});
