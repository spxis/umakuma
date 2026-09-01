import { describe, expect, it } from "vitest";

import { SEARCH_SOURCES, type SearchHit } from "./globalSearch";
import {
  SUGGEST_LIMIT,
  SUGGEST_MAX_PAGES,
  dedupeByGlyph,
  ghostFor,
  isSuggestable,
  suggestMinLength,
  suggestRawWindow,
  suggestRows,
  suggestUrl,
  suggestionHref,
} from "./globalSearchSuggest";

function hit(overrides: Partial<SearchHit> = {}): SearchHit {
  return {
    source: SEARCH_SOURCES.wanikani,
    key: "wanikani:1",
    glyph: "日",
    subjectType: "kanji",
    meaning: "Sun",
    reading: "にち",
    badges: ["Kanji", "L2"],
    href: null,
    score: 1000,
    ...overrides,
  };
}

describe("suggestMinLength", () => {
  it("lets a single Japanese character search", () => {
    expect(suggestMinLength("日")).toBe(1);
    expect(suggestMinLength("え")).toBe(1);
  });

  it("makes Latin wait for a second keystroke", () => {
    expect(suggestMinLength("s")).toBe(2);
  });
});

describe("isSuggestable", () => {
  it("accepts one Japanese character and two Latin ones", () => {
    expect(isSuggestable("日")).toBe(true);
    expect(isSuggestable("su")).toBe(true);
  });

  it("rejects one Latin letter and whitespace", () => {
    expect(isSuggestable("s")).toBe(false);
    expect(isSuggestable("   ")).toBe(false);
    expect(isSuggestable("")).toBe(false);
  });
});

describe("suggestUrl", () => {
  it("asks for enough raw hits to fill the rows it shows", () => {
    expect(suggestUrl("house")).toBe(`/api/search?q=house&limit=${suggestRawWindow(SUGGEST_LIMIT)}`);
  });

  it("widens the window as the list grows", () => {
    expect(suggestUrl("house", 20)).toBe(`/api/search?q=house&limit=${suggestRawWindow(20)}`);
  });

  it("encodes the query", () => {
    expect(suggestUrl("日 sun")).toContain(`q=${encodeURIComponent("日 sun")}`);
  });

  it("returns null below the threshold", () => {
    expect(suggestUrl("s")).toBeNull();
    expect(suggestUrl(" ")).toBeNull();
  });
});

describe("suggestRows", () => {
  it("grows a page at a time", () => {
    expect(suggestRows(1)).toBe(SUGGEST_LIMIT);
    expect(suggestRows(2)).toBe(SUGGEST_LIMIT * 2);
  });

  it("stops growing at the cap, where the results page takes over", () => {
    expect(suggestRows(SUGGEST_MAX_PAGES + 9)).toBe(SUGGEST_LIMIT * SUGGEST_MAX_PAGES);
    expect(suggestRows(0)).toBe(SUGGEST_LIMIT);
  });
});

describe("suggestRawWindow", () => {
  it("asks for three hits a row, the most copies one glyph can have", () => {
    expect(suggestRawWindow(10)).toBe(30);
  });
});

describe("dedupeByGlyph", () => {
  it("keeps the first appearance of a glyph and drops later copies", () => {
    const deduped = dedupeByGlyph([
      hit({ key: "wanikani:1", glyph: "日", score: 1000 }),
      hit({ key: "jlpt:日", glyph: "日", source: SEARCH_SOURCES.jlpt, score: 900 }),
      hit({ key: "grades:日", glyph: "日", source: SEARCH_SOURCES.grades, score: 900 }),
      hit({ key: "wanikani:2", glyph: "本", score: 800 }),
    ]);

    expect(deduped.map((item) => item.key)).toEqual(["wanikani:1", "wanikani:2"]);
  });

  it("caps the list at the suggestion limit", () => {
    const many = Array.from({ length: SUGGEST_LIMIT + 5 }, (_, index) =>
      hit({ key: `wanikani:${index}`, glyph: `glyph-${index}` }),
    );
    expect(dedupeByGlyph(many)).toHaveLength(SUGGEST_LIMIT);
  });

  it("preserves the incoming ranked order", () => {
    const deduped = dedupeByGlyph([
      hit({ key: "a", glyph: "家" }),
      hit({ key: "b", glyph: "宅" }),
    ]);
    expect(deduped.map((item) => item.key)).toEqual(["a", "b"]);
  });
});

describe("ghostFor", () => {
  it("completes the meaning the member started typing", () => {
    expect(ghostFor("ani", [hit({ meaning: "Animal", reading: null })])).toBe("mal");
  });

  it("ignores the case of what was typed", () => {
    expect(ghostFor("AN", [hit({ meaning: "Animal", reading: null })])).toBe("imal");
  });

  it("completes a kana reading, one reading at a time", () => {
    expect(ghostFor("にほ", [hit({ glyph: "日本", meaning: "Japan", reading: "にっぽん、にほん" })])).toBe("ん");
  });

  it("completes a multi-character glyph", () => {
    expect(ghostFor("家政", [hit({ glyph: "家政婦", meaning: "Housekeeper", reading: null })])).toBe("婦");
  });

  it("takes the completion from a later row when the top hit cannot finish the word", () => {
    const hits = [
      hit({ key: "grades:兄", glyph: "兄", meaning: "Older Brother", reading: "ケイ、あに" }),
      hit({ key: "jlpt:獣", glyph: "獣", meaning: "animal", reading: "ジュウ" }),
    ];
    expect(ghostFor("ani", hits)).toBe("mal");
  });

  it("offers nothing when no hit extends what was typed", () => {
    expect(ghostFor("animal", [hit({ glyph: "獣", meaning: "Beast", reading: "じゅう" })])).toBeNull();
  });

  it("offers nothing for an exact match, which has nothing left to complete", () => {
    expect(ghostFor("Animal", [hit({ meaning: "Animal", reading: null })])).toBeNull();
  });

  it("offers nothing without hits or without typing", () => {
    expect(ghostFor("ani", [])).toBeNull();
    expect(ghostFor("", [hit()])).toBeNull();
  });
});

describe("suggestionHref", () => {
  it("sends a signed-in member into their own explorer", () => {
    expect(suggestionHref(hit(), "kuma")).toBe("/users/kuma/library-explorer?q=%E6%97%A5");
  });

  it("routes a JLPT hit to the JLPT explorer", () => {
    const jlpt = hit({ source: SEARCH_SOURCES.jlpt, key: "jlpt:日" });
    expect(suggestionHref(jlpt, "kuma")).toBe("/users/kuma/jlpt-explorer?q=%E6%97%A5");
  });

  it("opens the public kanji page for an anonymous visitor", () => {
    expect(suggestionHref(hit(), null)).toBe("/kanji/%E6%97%A5");
  });

  it("falls back to the results page where there is no public page", () => {
    const word = hit({ glyph: "日曜日", subjectType: "vocabulary" });
    expect(suggestionHref(word, null)).toBe(`/search?query=${encodeURIComponent("日曜日")}`);
  });
});
