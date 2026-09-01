import { describe, expect, it } from "vitest";

import {
  SEARCH_PAGE_HREF,
  SEARCH_SOURCE_LABELS,
  SEARCH_SOURCE_ORDER,
  SEARCH_SOURCES,
  SEARCH_SOURCE_VALUES,
  appendHits,
  displayMeaning,
  isJapaneseQuery,
  isSearchSource,
  isSearchable,
  normalizeQuery,
  parseSources,
  publicKanjiHref,
  rankHit,
  rankMeanings,
  searchHitHref,
  searchRequestUrl,
  searchSubmitHref,
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
   * The explorers are behind the sign-in wall, so a reader with no account is
   * sent to the public kanji page rather than to a link that would bounce.
   */
  it("sends an anonymous searcher to the public page for a single kanji", () => {
    expect(searchHitHref(hit({ glyph: "日" }), null)).toBe("/kanji/%E6%97%A5");
  });

  it("sends a dictionary hit to the public page even for a signed-in member", () => {
    /* No explorer holds a character no catalogue teaches. */
    const entry = hit({ source: SEARCH_SOURCES.dictionary, key: "dictionary:渕", glyph: "渕" });
    expect(searchHitHref(entry, user)).toBe(`/kanji/${encodeURIComponent("渕")}`);
  });

  it("offers an anonymous searcher no link where there is no public page", () => {
    expect(searchHitHref(hit({ glyph: "日曜日", subjectType: "vocabulary" }), null)).toBeNull();
    expect(searchHitHref(hit({ glyph: "亠", subjectType: "radical" }), null)).toBeNull();
  });

  it("sends a WaniKani hit to the WaniKani explorer, already searched", () => {
    expect(searchHitHref(hit({ glyph: "鉛筆" }), user)).toBe(
      `/users/${user}/library-explorer?q=${encodeURIComponent("鉛筆")}`,
    );
  });

  it("sends a JLPT hit to the JLPT explorer", () => {
    expect(searchHitHref(hit({ source: SEARCH_SOURCES.jlpt, glyph: "水" }), user)).toBe(
      `/users/${user}/jlpt-explorer?q=${encodeURIComponent("水")}`,
    );
  });

  it("sends a grade hit to that grade's page, with the grade in the path", () => {
    expect(searchHitHref(hit({ source: SEARCH_SOURCES.grades, glyph: "水", grade: 3 }), user)).toBe(
      `/users/${user}/grades/3?q=${encodeURIComponent("水")}`,
    );
  });

  it("falls back to the first grade rather than building a broken link", () => {
    expect(searchHitHref(hit({ source: SEARCH_SOURCES.grades, glyph: "水" }), user)).toContain("/grades/1");
  });

  it("escapes a name that needs it", () => {
    expect(searchHitHref(hit({ glyph: "日" }), "a b")).toContain("/users/a%20b/");
  });
});

describe("searchRequestUrl", () => {
  it("asks for the whole answer when no window is given", () => {
    expect(searchRequestUrl("house")).toBe("/api/search?q=house");
  });

  it("carries the window and the source filter", () => {
    expect(searchRequestUrl("house", { limit: 20, offset: 40, sources: [SEARCH_SOURCES.jlpt] })).toBe(
      "/api/search?q=house&sources=jlpt&limit=20&offset=40",
    );
  });

  it("leaves a zero offset out, so the first stretch keeps one cache key", () => {
    expect(searchRequestUrl("house", { limit: 20, offset: 0 })).toBe("/api/search?q=house&limit=20");
  });

  it("encodes the query", () => {
    expect(searchRequestUrl("日 sun")).toBe(`/api/search?q=${encodeURIComponent("日 sun")}`);
  });
});

describe("source precedence", () => {
  /*
   * Keys sort alphabetically, so "dictionary:水" would come before every
   * catalogue and push the row carrying someone's review state below a
   * reference row that carries none.
   */
  it("puts a catalogue ahead of the dictionary at the same score", () => {
    const sorted = sortHits([
      hit({ key: "dictionary:水", source: SEARCH_SOURCES.dictionary, glyph: "水", score: 900 }),
      hit({ key: "wanikani:1", source: SEARCH_SOURCES.wanikani, glyph: "水", score: 900 }),
    ]);
    expect(sorted[0].source).toBe(SEARCH_SOURCES.wanikani);
  });

  it("still ranks by score first, whatever the source", () => {
    const sorted = sortHits([
      hit({ key: "wanikani:1", source: SEARCH_SOURCES.wanikani, glyph: "水", score: 400 }),
      hit({ key: "dictionary:水", source: SEARCH_SOURCES.dictionary, glyph: "水", score: 900 }),
    ]);
    expect(sorted[0].source).toBe(SEARCH_SOURCES.dictionary);
  });

  it("names every source it can sort", () => {
    for (const source of SEARCH_SOURCE_VALUES) {
      expect(SEARCH_SOURCE_ORDER[source]).toBeTypeOf("number");
      expect(SEARCH_SOURCE_LABELS[source]).toBeTruthy();
    }
  });
});

describe("publicKanjiHref", () => {
  it("gives a single kanji its own public page", () => {
    expect(publicKanjiHref(hit({ glyph: "水" }))).toBe("/kanji/%E6%B0%B4");
  });

  it("gives a word none, since that page holds one character", () => {
    expect(publicKanjiHref(hit({ glyph: "日曜日", subjectType: "vocabulary" }))).toBeNull();
  });

  it("gives a radical none, since many are drawn rather than written", () => {
    expect(publicKanjiHref(hit({ glyph: "亠", subjectType: "radical" }))).toBeNull();
  });
});

describe("rankMeanings", () => {
  it("scores a subject on the meaning that matched, not on its first", () => {
    const ranked = rankMeanings(["magnate"], "王", ["King", "king", "magnate", "rule"], "オウ");
    expect(ranked.score).toBeGreaterThan(0);
    expect(ranked.meaning).toBe("magnate");
  });

  it("keeps the primary when the primary is what matched", () => {
    const ranked = rankMeanings(["king"], "王", ["King", "magnate"], "オウ");
    expect(ranked.meaning).toBe("King");
  });

  it("takes the best meaning when several match", () => {
    const ranked = rankMeanings(["circle"], "円", ["Yen", "Circle", "circle around"], "エン");
    expect(ranked.meaning).toBe("Circle");
  });

  it("still scores zero when nothing matches, so non-matches stay dropped", () => {
    expect(rankMeanings(["bicycle"], "王", ["King", "magnate"], "オウ").score).toBe(0);
  });

  it("reports the first meaning when there is no match to report", () => {
    expect(rankMeanings(["bicycle"], "王", ["King"], null).meaning).toBe("King");
  });

  it("survives a subject with no meanings at all", () => {
    expect(rankMeanings(["king"], "王", [], null)).toEqual({ score: 0, meaning: "" });
  });
});

describe("displayMeaning", () => {
  it("shows the matched meaning behind the primary one", () => {
    expect(displayMeaning("King", "magnate")).toBe("King · magnate");
  });

  it("says it once when the match is the primary meaning", () => {
    expect(displayMeaning("King", "King")).toBe("King");
  });

  it("treats a difference of case as the same meaning", () => {
    expect(displayMeaning("Right", "right")).toBe("Right");
  });

  it("falls back to whichever one exists", () => {
    expect(displayMeaning("", "magnate")).toBe("magnate");
    expect(displayMeaning("King", "")).toBe("King");
  });
});

describe("searchSubmitHref", () => {
  const results = (query: string) => `/search?query=${encodeURIComponent(query)}&in=jlpt`;

  it("searches for what was typed", () => {
    expect(searchSubmitHref("house", results)).toBe("/search?query=house&in=jlpt");
  });

  it("trims before searching", () => {
    expect(searchSubmitHref("  house  ", results)).toBe("/search?query=house&in=jlpt");
  });

  it("opens the search page when there is nothing to search", () => {
    expect(searchSubmitHref("", results)).toBe(SEARCH_PAGE_HREF);
    expect(searchSubmitHref("   ", results)).toBe(SEARCH_PAGE_HREF);
  });
});

describe("appendHits", () => {
  it("adds the next stretch after what is already listed", () => {
    const listed = [hit({ key: "a" }), hit({ key: "b" })];
    expect(appendHits(listed, [hit({ key: "c" })]).map((row) => row.key)).toEqual(["a", "b", "c"]);
  });

  it("drops a row already listed, so a late answer cannot double it", () => {
    const listed = [hit({ key: "a" }), hit({ key: "b" })];
    const next = [hit({ key: "b" }), hit({ key: "c" })];
    expect(appendHits(listed, next).map((row) => row.key)).toEqual(["a", "b", "c"]);
  });

  it("leaves the list alone when the stretch is empty", () => {
    const listed = [hit({ key: "a" })];
    expect(appendHits(listed, [])).toEqual(listed);
  });
});
