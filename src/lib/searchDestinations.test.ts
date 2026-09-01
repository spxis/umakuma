import { describe, expect, it } from "vitest";

import { SEARCH_SOURCES, searchHitHref, type SearchHit } from "./globalSearch";
import { SUBJECT_TYPES } from "./domainConstants";

/**
 * Where a search result leads.
 *
 * The search page found 水泡 - Foam, vocabulary, WaniKani level 46 - and
 * selecting it opened the library explorer, which answered "No item matched
 * 水泡" about the word it had just been shown. The explorer was not being
 * stubborn: it is built from the member's own levels and stops at theirs, so a
 * member on level 17 has no level 46 to show it in. No filter change reaches
 * it. The address was wrong, not the page.
 *
 * So the rule these hold to: a result leads to the thing it found, at an
 * address that names that thing. A list address filtered by a query is a
 * request the surface is free to answer with nothing, and search results are
 * exactly where that goes wrong - the searcher has already been told the item
 * exists, so an empty page reads as the site losing it.
 *
 * Every kind here is a thing a member clicks: a kanji, a word, a radical drawn
 * as a character and one drawn as a picture, and the same character as each
 * catalogue holds it.
 */

function hit(overrides: Partial<SearchHit>): SearchHit {
  return {
    source: SEARCH_SOURCES.wanikani,
    key: "wanikani:1",
    glyph: "水",
    subjectType: SUBJECT_TYPES.kanji,
    slug: "水",
    meaning: "Water",
    reading: "すい",
    badges: [],
    href: null,
    score: 1000,
    ...overrides,
  };
}

/** What the three catalogues and the dictionary actually return. */
const RESULTS: Record<string, SearchHit> = {
  "a WaniKani kanji": hit({
    key: "wanikani:476",
    glyph: "水",
    subjectType: SUBJECT_TYPES.kanji,
    slug: "水",
    badges: ["KANJI", "L2"],
  }),

  /*
   * The reported one. Level 46, found by a member on level 17.
   */
  "a word above the member's level": hit({
    key: "wanikani:2551",
    glyph: "水泡",
    subjectType: SUBJECT_TYPES.vocabulary,
    slug: "水泡",
    meaning: "Foam",
    reading: "すいほう",
    badges: ["VOCAB", "L46"],
  }),

  "a word inside the member's level": hit({
    key: "wanikani:2467",
    glyph: "鉛筆",
    subjectType: SUBJECT_TYPES.vocabulary,
    slug: "鉛筆",
    meaning: "Pencil",
    reading: "えんぴつ",
    badges: ["VOCAB", "L12"],
  }),

  "a radical written as a character": hit({
    key: "wanikani:1",
    glyph: "一",
    subjectType: SUBJECT_TYPES.radical,
    slug: "ground",
    meaning: "Ground",
    reading: null,
    badges: ["RAD", "L1"],
  }),

  /*
   * Many radicals have no character at all - WaniKani draws them - so the
   * catalogue falls back to the slug for something to show. An address built
   * from the glyph would be built from a name, and there is no such kanji.
   */
  "a radical drawn as a picture": hit({
    key: "wanikani:8769",
    glyph: "leaf",
    subjectType: SUBJECT_TYPES.radical,
    slug: "leaf",
    meaning: "Leaf",
    reading: null,
    badges: ["RAD", "L23"],
  }),

  "a JLPT kanji": hit({
    source: SEARCH_SOURCES.jlpt,
    key: "jlpt:水",
    glyph: "水",
    subjectType: SUBJECT_TYPES.kanji,
    slug: null,
    badges: ["N5"],
  }),

  "a school-grade kanji": hit({
    source: SEARCH_SOURCES.grades,
    key: "grades:水",
    glyph: "水",
    subjectType: SUBJECT_TYPES.kanji,
    slug: null,
    grade: 1,
    badges: ["G1"],
  }),

  /*
   * 渕 is in no catalogue the site teaches from; the dictionary is the only
   * thing that knows it exists.
   */
  "a dictionary-only kanji": hit({
    source: SEARCH_SOURCES.dictionary,
    key: "dictionary:渕",
    glyph: "渕",
    subjectType: SUBJECT_TYPES.kanji,
    slug: null,
    meaning: "Abyss",
    badges: ["#4021"],
  }),
};

/** Addresses that answer with a list, which may legitimately be empty. */
const LIST_ADDRESSES = [
  "/library-explorer",
  "/jlpt-explorer",
  "/study-explorer",
  "/grades/",
  "/search",
];

describe("every result leads somewhere that shows it", () => {
  for (const [what, result] of Object.entries(RESULTS)) {
    it(`gives ${what} somewhere to go`, () => {
      /*
       * A word or a radical used to have no public address at all, so a
       * signed-out reader got dead text: rows that look like links, do nothing
       * when clicked, and say nothing about why.
       */
      expect(searchHitHref(result)).toBeTruthy();
    });

    it(`does not answer ${what} with a list`, () => {
      const href = searchHitHref(result) ?? "";
      for (const list of LIST_ADDRESSES) {
        expect(href, `${what} was sent to ${href}`).not.toContain(list);
      }
    });

    it(`names ${what} in the address`, () => {
      /*
       * The identity is in the path, not in a query the surface may ignore. A
       * radical is named by its slug because a good number of them have no
       * character; everything else is named by the characters themselves.
       */
      const identity =
        result.subjectType === SUBJECT_TYPES.radical ? (result.slug ?? result.glyph) : result.glyph;
      const [path = ""] = (searchHitHref(result) ?? "").split("?");
      expect(decodeURIComponent(path)).toContain(identity);
    });
  }
});

describe("the word that started this", () => {
  const foam = RESULTS["a word above the member's level"]!;

  /*
   * The explorer is built from the member's levels and offers chips 1..17 for
   * a member on 17. Sending a level 46 word there is asking a page to show
   * something it has no room for.
   */
  it("does not send a level 46 word to a level-capped explorer", () => {
    expect(searchHitHref(foam)).not.toContain("library-explorer");
  });

  it("sends it to its own page instead", () => {
    expect(searchHitHref(foam)).toBe(`/vocabulary/${encodeURIComponent("水泡")}`);
  });

  /*
   * The address does not take a viewer at all, which is the strongest form of
   * this: a member and a visitor cannot be given different answers, and a link
   * copied out of a result works for whoever it is sent to.
   */
  it("is the same address for everybody, by construction", () => {
    expect(searchHitHref).toHaveLength(1);
  });
});

describe("each kind of thing gets the page built for it", () => {
  it("takes a kanji to the kanji page", () => {
    expect(searchHitHref(RESULTS["a WaniKani kanji"]!)).toBe(`/kanji/${encodeURIComponent("水")}`);
  });

  it("takes every catalogue's copy of one character to the same page", () => {
    /*
     * 水 is in WaniKani, the JLPT lists, grade one and the dictionary. Four
     * rows, one character, one page: a reader who picks the JLPT row and a
     * reader who picks the WaniKani row are asking the same question.
     */
    const addresses = new Set(
      [
        RESULTS["a WaniKani kanji"]!,
        RESULTS["a JLPT kanji"]!,
        RESULTS["a school-grade kanji"]!,
      ].map((result) => searchHitHref(result)),
    );
    expect(addresses).toEqual(new Set([`/kanji/${encodeURIComponent("水")}`]));
  });

  it("takes a word to the word page", () => {
    expect(searchHitHref(RESULTS["a word inside the member's level"]!)).toBe(
      `/vocabulary/${encodeURIComponent("鉛筆")}`,
    );
  });

  it("takes a radical to the radical page, by slug", () => {
    expect(searchHitHref(RESULTS["a radical written as a character"]!)).toBe("/radicals/ground");
  });

  it("takes a drawn radical there too, rather than to a kanji that does not exist", () => {
    expect(searchHitHref(RESULTS["a radical drawn as a picture"]!)).toBe("/radicals/leaf");
  });

  it("takes a dictionary-only kanji to the kanji page", () => {
    expect(searchHitHref(RESULTS["a dictionary-only kanji"]!)).toBe(
      `/kanji/${encodeURIComponent("渕")}`,
    );
  });
});

describe("addresses that have to survive being pasted", () => {
  it("escapes a word so the link holds together", () => {
    const href = searchHitHref(RESULTS["a word above the member's level"]!) ?? "";
    expect(href).not.toContain("水泡");
    expect(decodeURIComponent(href)).toContain("水泡");
  });

  it("escapes a radical slug that has a space in it", () => {
    const spaced = hit({
      subjectType: SUBJECT_TYPES.radical,
      glyph: "leaf",
      slug: "leaf on tree",
    });
    expect(searchHitHref(spaced)).toBe("/radicals/leaf%20on%20tree");
  });

  /*
   * A radical with no slug is a row the catalogue could not identify. There is
   * nothing to link to, and a link to /radicals/ would be a page listing every
   * radical - the empty-list answer this whole file exists to prevent.
   */
  it("offers nothing for a radical with no slug, rather than a wrong page", () => {
    const nameless = hit({ subjectType: SUBJECT_TYPES.radical, glyph: "?", slug: null });
    expect(searchHitHref(nameless)).toBeNull();
  });
});
