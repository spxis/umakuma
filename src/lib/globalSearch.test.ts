import { describe, expect, it } from "vitest";

import {
  SEARCH_SOURCES,
  SEARCH_SOURCE_VALUES,
  isJapaneseQuery,
  isSearchSource,
  isSearchable,
  normalizeQuery,
  parseSources,
  rankHit,
  searchHitHref,
  sortHits,
  type SearchHit,
} from "./globalSearch";

function hit(overrides: Partial<SearchHit> = {}): SearchHit {
  return {
    source: SEARCH_SOURCES.wanikani,
    key: "k",
    glyph: "日",
    subjectType: "kanji",
    meaning: "Sun",
    reading: "にち",
    badges: [],
    href: null,
    score: 0,
    ...overrides,
  };
}

describe("normalizeQuery", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeQuery("  red   pencil  ")).toBe("red pencil");
  });

  it("treats nothing as nothing", () => {
    expect(normalizeQuery(null)).toBe("");
    expect(normalizeQuery("   ")).toBe("");
    expect(isSearchable("")).toBe(false);
  });

  it("caps a very long query rather than passing it to the database", () => {
    expect(normalizeQuery("x".repeat(500))).toHaveLength(64);
  });
});

describe("isJapaneseQuery", () => {
  it("recognises kana and kanji", () => {
    expect(isJapaneseQuery("えんぴつ")).toBe(true);
    expect(isJapaneseQuery("鉛筆")).toBe(true);
    expect(isJapaneseQuery("エンピツ")).toBe(true);
  });

  it("does not mistake romaji for Japanese", () => {
    expect(isJapaneseQuery("pencil")).toBe(false);
  });
});

describe("parseSources", () => {
  it("defaults to every catalogue", () => {
    expect(parseSources(null)).toEqual(SEARCH_SOURCE_VALUES);
    expect(parseSources("")).toEqual(SEARCH_SOURCE_VALUES);
  });

  it("takes the ones a caller names", () => {
    expect(parseSources("jlpt,grades")).toEqual([SEARCH_SOURCES.jlpt, SEARCH_SOURCES.grades]);
  });

  it("ignores a source that does not exist rather than failing", () => {
    expect(parseSources("jlpt,martian")).toEqual([SEARCH_SOURCES.jlpt]);
  });

  it("does not repeat a source named twice", () => {
    expect(parseSources("jlpt,jlpt")).toEqual([SEARCH_SOURCES.jlpt]);
  });

  it("falls back to everything when nothing named is real", () => {
    expect(parseSources("martian")).toEqual(SEARCH_SOURCE_VALUES);
  });

  it("knows its own source names", () => {
    expect(isSearchSource("jlpt")).toBe(true);
    expect(isSearchSource("nope")).toBe(false);
  });
});

describe("rankHit", () => {
  /*
   * The searcher who types 日 wants the character, not the fifty words that
   * contain it, so an exact glyph has to outrank every substring match.
   */
  it("puts an exact character above a word containing it", () => {
    expect(rankHit("日", "日", "Sun", "にち")).toBeGreaterThan(rankHit("日", "日曜日", "Sunday", "にちようび"));
  });

  it("puts an exact meaning above a partial one", () => {
    expect(rankHit("sun", "日", "Sun", null)).toBeGreaterThan(rankHit("sun", "向日葵", "Sunflower", null));
  });

  it("prefers a tighter meaning when both merely contain the word", () => {
    expect(rankHit("sun", "A", "Sunflower", null)).toBeGreaterThan(rankHit("sun", "B", "Sunflower seed merchant", null));
  });

  it("matches a whole reading", () => {
    expect(rankHit("にち", "日", "Sun", "にち")).toBeGreaterThan(0);
  });

  it("scores nothing when the query appears nowhere", () => {
    expect(rankHit("zebra", "日", "Sun", "にち")).toBe(0);
  });

  it("is case-insensitive on meanings", () => {
    expect(rankHit("SUN", "日", "Sun", null)).toBe(rankHit("sun", "日", "Sun", null));
  });
});

describe("sortHits", () => {
  it("orders by score, best first", () => {
    const sorted = sortHits([hit({ key: "low", score: 10 }), hit({ key: "high", score: 900 })]);
    expect(sorted.map((item) => item.key)).toEqual(["high", "low"]);
  });

  it("breaks a tie toward the shorter glyph", () => {
    const sorted = sortHits([
      hit({ key: "long", glyph: "日曜日", score: 400 }),
      hit({ key: "short", glyph: "日", score: 400 }),
    ]);
    expect(sorted[0].key).toBe("short");
  });

  it("is stable for hits alike in every way", () => {
    const sorted = sortHits([hit({ key: "b", score: 5 }), hit({ key: "a", score: 5 })]);
    expect(sorted.map((item) => item.key)).toEqual(["a", "b"]);
  });

  it("leaves the input array alone", () => {
    const input = [hit({ key: "a", score: 1 }), hit({ key: "b", score: 2 })];
    sortHits(input);
    expect(input.map((item) => item.key)).toEqual(["a", "b"]);
  });
});

describe("searchHitHref", () => {
  const user = "johnmorrisdotca";

  /*
   * Every destination is one of the viewer's own explorer pages, so with nobody
   * signed in a link would only bounce off the sign-in wall.
   */
  it("offers no link to an anonymous searcher", () => {
    expect(searchHitHref(hit(), null)).toBeNull();
  });

  it("sends a WaniKani hit to the WaniKani explorer, already searched", () => {
    expect(searchHitHref(hit({ glyph: "鉛筆" }), user)).toBe(
      `/users/${user}/library-explorer?findLevel=${encodeURIComponent("鉛筆")}`,
    );
  });

  it("sends a JLPT hit to the JLPT explorer", () => {
    expect(searchHitHref(hit({ source: SEARCH_SOURCES.jlpt, glyph: "水" }), user)).toBe(
      `/users/${user}/jlpt-explorer?findJlpt=${encodeURIComponent("水")}`,
    );
  });

  it("sends a grade hit to that grade's page", () => {
    expect(searchHitHref(hit({ source: SEARCH_SOURCES.grades, glyph: "水", grade: 1 }), user)).toBe(
      `/users/${user}/grades?grade=1&q=${encodeURIComponent("水")}`,
    );
  });

  it("falls back to the first grade rather than building a broken link", () => {
    expect(searchHitHref(hit({ source: SEARCH_SOURCES.grades, glyph: "水" }), user)).toContain("grade=1");
  });

  it("escapes a name that needs it", () => {
    expect(searchHitHref(hit({ glyph: "日" }), "a b")).toContain("/users/a%20b/");
  });
});
