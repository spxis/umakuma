import { describe, expect, it } from "vitest";

import { SEARCH_SOURCES, type SearchHit } from "./globalSearch";
import { SUBJECT_TYPES } from "./domainConstants";
import {
  SEARCH_KINDS,
  SEARCH_KIND_LABELS,
  SEARCH_KIND_VALUES,
  countByKind,
  hitMatchesKind,
  isSearchKind,
  kindForHit,
  sectionsFor,
} from "./searchKinds";

/**
 * Cutting the results by what kind of thing they are.
 *
 * Searching 中 returns the kanji, the radical drawn the same way, and thirty
 * words that contain it, all in one ranked column. A reader looking for the
 * character reads past the words to find it, and nothing on the page says how
 * many of each there are.
 *
 * These walk what a member actually searches for: one character, an English
 * meaning, a word, and a radical's name.
 */

function hit(overrides: Partial<SearchHit>): SearchHit {
  return {
    source: SEARCH_SOURCES.wanikani,
    key: "wanikani:1",
    glyph: "中",
    subjectType: SUBJECT_TYPES.kanji,
    slug: "中",
    meaning: "Middle",
    reading: "ちゅう",
    badges: [],
    href: null,
    score: 500,
    ...overrides,
  };
}

const KANJI = hit({ key: "k", subjectType: SUBJECT_TYPES.kanji, score: 1000 });
const WORD = hit({ key: "w", glyph: "中国", subjectType: SUBJECT_TYPES.vocabulary, score: 600 });
const RADICAL = hit({ key: "r", subjectType: SUBJECT_TYPES.radical, slug: "middle", score: 400 });

describe("which kind a result is", () => {
  it("calls vocabulary a word", () => {
    expect(kindForHit(WORD)).toBe(SEARCH_KINDS.words);
  });

  it("calls a radical a radical", () => {
    expect(kindForHit(RADICAL)).toBe(SEARCH_KINDS.radicals);
  });

  /*
   * JLPT, the school grades and the dictionary hold nothing but kanji, so
   * everything that is not a word or a radical is one - including a row from a
   * source that never says so.
   */
  it("calls everything else kanji, whichever source it came from", () => {
    for (const source of [SEARCH_SOURCES.jlpt, SEARCH_SOURCES.grades, SEARCH_SOURCES.dictionary]) {
      expect(kindForHit(hit({ source, subjectType: SUBJECT_TYPES.kanji }))).toBe(SEARCH_KINDS.kanji);
    }
  });

  it("names every kind it can sort", () => {
    for (const kind of SEARCH_KIND_VALUES) {
      expect(SEARCH_KIND_LABELS[kind]).toBeTruthy();
      expect(isSearchKind(kind)).toBe(true);
    }
    expect(isSearchKind("names")).toBe(false);
  });
});

describe("counting them", () => {
  it("counts each kind, and zero for the kinds with none", () => {
    expect(countByKind([KANJI, WORD, WORD])).toEqual({
      words: 2,
      kanji: 1,
      radicals: 0,
    });
  });

  it("counts nothing as zeroes rather than as an empty object", () => {
    expect(countByKind([])).toEqual({ words: 0, kanji: 0, radicals: 0 });
  });
});

describe("filtering to one kind", () => {
  it("keeps only that kind", () => {
    expect(hitMatchesKind(WORD, SEARCH_KINDS.words)).toBe(true);
    expect(hitMatchesKind(KANJI, SEARCH_KINDS.words)).toBe(false);
  });

  it("keeps everything when no kind was asked for", () => {
    for (const entry of [KANJI, WORD, RADICAL]) {
      expect(hitMatchesKind(entry, null)).toBe(true);
    }
  });
});

describe("which section leads", () => {
  /*
   * The whole reason the order is not fixed. Searching the character 水 means
   * the character; Words-always-first would put every compound above it.
   */
  it("leads with the section holding the best answer", () => {
    const sections = sectionsFor([KANJI, WORD, RADICAL]);
    expect(sections.map((section) => section.kind)).toEqual(["kanji", "words", "radicals"]);
  });

  it("leads with words when a word is the best answer", () => {
    const exactWord = hit({ key: "w2", glyph: "中国", subjectType: SUBJECT_TYPES.vocabulary, score: 1000 });
    const weakerKanji = hit({ key: "k2", score: 600 });
    expect(sectionsFor([exactWord, weakerKanji])[0]!.kind).toBe(SEARCH_KINDS.words);
  });

  /* Ties fall back to the fixed order, so equal answers do not shuffle. */
  it("settles a tie the same way every time", () => {
    const tiedKanji = hit({ key: "k3", score: 700 });
    const tiedWord = hit({ key: "w3", subjectType: SUBJECT_TYPES.vocabulary, score: 700 });
    expect(sectionsFor([tiedKanji, tiedWord]).map((section) => section.kind)).toEqual([
      "words",
      "kanji",
    ]);
    expect(sectionsFor([tiedWord, tiedKanji]).map((section) => section.kind)).toEqual([
      "words",
      "kanji",
    ]);
  });

  it("keeps each section's own ranking", () => {
    const strong = hit({ key: "w4", subjectType: SUBJECT_TYPES.vocabulary, score: 900 });
    const weak = hit({ key: "w5", subjectType: SUBJECT_TYPES.vocabulary, score: 100 });
    const section = sectionsFor([strong, weak, KANJI]).find((entry) => entry.kind === "words");
    expect(section?.hits.map((entry) => entry.key)).toEqual(["w4", "w5"]);
  });

  /* A heading over nothing is a section that says the search failed twice. */
  it("drops a kind with no results rather than heading an empty list", () => {
    expect(sectionsFor([WORD]).map((section) => section.kind)).toEqual(["words"]);
    expect(sectionsFor([])).toEqual([]);
  });

  it("puts every hit in exactly one section", () => {
    const all = [KANJI, WORD, RADICAL];
    const placed = sectionsFor(all).flatMap((section) => section.hits);
    expect(placed).toHaveLength(all.length);
    expect(new Set(placed.map((entry) => entry.key)).size).toBe(all.length);
  });
});
