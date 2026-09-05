import { describe, expect, it } from "vitest";

import { SUBJECT_TYPES } from "./domainConstants";
import {
  RELATED_GROUPS,
  RELATED_LIMIT,
  relatedGroupsFor,
  toRelatedSubject,
  type RelatedRow,
} from "./relatedSubjects";

/**
 * What a subject connects to.
 *
 * The study surfaces have shown this from the start; the public pages showed
 * one relation out of four. A word page listed the kanji it was written with
 * and stopped, and the kanji page never touched the catalogue at all - so the
 * page a shared link opens knew less about 水 than the page behind the
 * sign-in wall, and the compounds, which are the reason to look a kanji up,
 * were nowhere.
 *
 * The cases below are the four relations as WaniKani actually stores them,
 * which is the part that is easy to get backwards: the same field means kanji
 * under a radical and words under a kanji.
 */

function row(overrides: Partial<RelatedRow> & { subjectId: number }): RelatedRow {
  return {
    subjectType: SUBJECT_TYPES.kanji,
    level: 1,
    characters: "水",
    slug: "水",
    meaning: "Water",
    reading: "すい",
    ...overrides,
  };
}

const WATER_KANJI = row({ subjectId: 476, characters: "水", slug: "水", level: 2 });
const BUBBLE_KANJI = row({ subjectId: 900, characters: "泡", slug: "泡", meaning: "Bubbles", level: 42 });
const FOAM_WORD = row({
  subjectId: 2551,
  subjectType: SUBJECT_TYPES.vocabulary,
  characters: "水泡",
  slug: "水泡",
  meaning: "Foam",
  reading: "すいほう",
  level: 46,
});
const DRAWN_RADICAL = row({
  subjectId: 8769,
  subjectType: SUBJECT_TYPES.radical,
  characters: null,
  slug: "leaf",
  meaning: "Leaf",
  reading: null,
  level: 23,
});

describe("a row as something to link to", () => {
  it("sends a kanji to the kanji page", () => {
    expect(toRelatedSubject(WATER_KANJI)?.href).toBe(`/kanji/${encodeURIComponent("水")}`);
  });

  it("sends a word to the word page", () => {
    expect(toRelatedSubject(FOAM_WORD)?.href).toBe(`/vocabulary/${encodeURIComponent("水泡")}`);
  });

  /* A drawn radical has no character, so its name is both label and address. */
  it("sends a drawn radical to the radical page, and shows its name", () => {
    const subject = toRelatedSubject(DRAWN_RADICAL);
    expect(subject?.href).toBe("/radicals/leaf");
    expect(subject?.label).toBe("leaf");
  });

  /*
   * A chip that goes nowhere is worse than an absent one: it looks like every
   * chip beside it and does nothing.
   */
  it("drops a row the catalogue could not name", () => {
    expect(toRelatedSubject(row({ subjectId: 1, subjectType: "radical", characters: null, slug: null }))).toBeNull();
    expect(toRelatedSubject(row({ subjectId: 2, subjectType: "nonsense" }))).toBeNull();
  });
});

describe("a kanji's groups", () => {
  /*
   * The reason to look a kanji up. 水 on its own is a fact; 水泡 and the rest
   * are what knowing it buys, and they were on no public page.
   */
  it("lists the words it is used in", () => {
    const groups = relatedGroupsFor({
      subjectId: 476,
      subjectType: SUBJECT_TYPES.kanji,
      components: [DRAWN_RADICAL],
      amalgamations: [FOAM_WORD],
    });

    expect(groups.map((group) => group.id)).toEqual([RELATED_GROUPS.builtFrom, RELATED_GROUPS.usedIn]);
    expect(groups[1]!.items.map((item) => item.label)).toEqual(["水泡"]);
  });

  it("keeps what it is built from separate from what is built from it", () => {
    const groups = relatedGroupsFor({
      subjectId: 476,
      subjectType: SUBJECT_TYPES.kanji,
      components: [DRAWN_RADICAL],
      amalgamations: [FOAM_WORD],
    });
    expect(groups[0]!.items[0]!.label).toBe("leaf");
    expect(groups[1]!.items[0]!.label).toBe("水泡");
  });
});

describe("a radical's groups", () => {
  /*
   * The same field that holds words under a kanji holds kanji under a radical.
   * Reading it as words would put a kanji behind a /vocabulary address.
   */
  it("lists the kanji built from it", () => {
    const groups = relatedGroupsFor({
      subjectId: 8769,
      subjectType: SUBJECT_TYPES.radical,
      components: [],
      amalgamations: [WATER_KANJI],
    });

    expect(groups.map((group) => group.id)).toEqual([RELATED_GROUPS.usedIn]);
    expect(groups[0]!.items[0]!.href).toBe(`/kanji/${encodeURIComponent("水")}`);
  });
});

describe("a word's groups", () => {
  it("lists the kanji it is written with", () => {
    const groups = relatedGroupsFor({
      subjectId: 2551,
      subjectType: SUBJECT_TYPES.vocabulary,
      components: [WATER_KANJI, BUBBLE_KANJI],
      amalgamations: [],
    });
    expect(groups.map((group) => group.id)).toEqual([RELATED_GROUPS.builtFrom]);
    expect(groups[0]!.items.map((item) => item.label)).toEqual(["水", "泡"]);
  });

  /* The neighbourhood: other words built from the same characters. */
  it("lists other words sharing its kanji", () => {
    const swimming = row({
      subjectId: 2600,
      subjectType: SUBJECT_TYPES.vocabulary,
      characters: "水泳",
      slug: "水泳",
      meaning: "Swimming",
      level: 10,
    });

    const groups = relatedGroupsFor({
      subjectId: 2551,
      subjectType: SUBJECT_TYPES.vocabulary,
      components: [WATER_KANJI],
      amalgamations: [],
      neighbours: [swimming, FOAM_WORD],
    });

    const shares = groups.find((group) => group.id === RELATED_GROUPS.sharesKanji);
    /* Itself is not one of its own neighbours. */
    expect(shares?.items.map((item) => item.label)).toEqual(["水泳"]);
  });

  it("does not repeat the kanji it already listed", () => {
    const groups = relatedGroupsFor({
      subjectId: 2551,
      subjectType: SUBJECT_TYPES.vocabulary,
      components: [WATER_KANJI],
      amalgamations: [],
      neighbours: [WATER_KANJI],
    });
    expect(groups.map((group) => group.id)).toEqual([RELATED_GROUPS.builtFrom]);
  });

  /* Look-alikes are a kanji relation; a word has none and must not claim any. */
  it("offers no look-alikes", () => {
    const groups = relatedGroupsFor({
      subjectId: 2551,
      subjectType: SUBJECT_TYPES.vocabulary,
      components: [],
      amalgamations: [],
    });
    expect(groups).toEqual([]);
  });
});

describe("how much of a group is drawn", () => {
  const many = Array.from({ length: RELATED_LIMIT + 25 }, (_, index) =>
    row({
      subjectId: 5000 + index,
      subjectType: SUBJECT_TYPES.vocabulary,
      characters: `語${index}`,
      slug: `word-${index}`,
      level: 60 - index,
    }),
  );

  /* 一 appears in hundreds of words; all of them is a page nobody scrolls. */
  it("stops at a length that still reads as a list", () => {
    const groups = relatedGroupsFor({
      subjectId: 1,
      subjectType: SUBJECT_TYPES.kanji,
      components: [],
      amalgamations: many,
    });
    expect(groups[0]!.items).toHaveLength(RELATED_LIMIT);
  });

  /* Easiest first, because a list of words is read as a place to start. */
  it("keeps the easiest, not the first the database happened to return", () => {
    const groups = relatedGroupsFor({
      subjectId: 1,
      subjectType: SUBJECT_TYPES.kanji,
      components: [],
      amalgamations: many,
    });
    const levels = groups[0]!.items.map((item) => item.level);
    expect(levels).toEqual([...levels].sort((left, right) => left - right));
    expect(levels[0]).toBe(60 - (many.length - 1));
  });

  it("lists a subject once however many ways it arrived", () => {
    const groups = relatedGroupsFor({
      subjectId: 1,
      subjectType: SUBJECT_TYPES.kanji,
      components: [],
      amalgamations: [FOAM_WORD, FOAM_WORD],
    });
    expect(groups[0]!.items).toHaveLength(1);
  });

  it("drops a group with nothing in it rather than heading an empty shelf", () => {
    expect(
      relatedGroupsFor({
        subjectId: 1,
        subjectType: SUBJECT_TYPES.kanji,
        components: [],
        amalgamations: [],
      }),
    ).toEqual([]);
  });
});
