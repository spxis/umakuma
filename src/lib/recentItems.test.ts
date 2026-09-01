import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { SEARCH_SOURCES, type SearchHit } from "./globalSearch";
import { SUBJECT_TYPES } from "./domainConstants";
import {
  RECENT_ITEMS_MEMORY,
  addRecentItem,
  isSubjectItem,
  recentHit,
  recentQuery,
  removeRecentItem,
  type RecentItem,
} from "./recentItems";

/**
 * What the browser remembers having looked up.
 *
 * The history held only the words that were typed, which is half of what a
 * lookup is. Searching "water", reading down forty rows and opening 水兵 left
 * "water" remembered and 水兵 - the thing actually found - forgotten. The
 * question was kept and the answer thrown away.
 *
 * These walk the things a member opens: a word, a kanji, a radical, and a
 * search that was run, since all four are rows in the same list now.
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

const SAILOR = hit({
  key: "wanikani:2467",
  glyph: "水兵",
  subjectType: SUBJECT_TYPES.vocabulary,
  slug: "水兵",
  meaning: "Navy Sailor · Sailor",
  reading: "すいへい",
});

describe("what a lookup leaves behind", () => {
  it("remembers a word that was opened, not only the word that was typed", () => {
    const item = recentHit(SAILOR);
    expect(item).toEqual({
      href: `/vocabulary/${encodeURIComponent("水兵")}`,
      label: "水兵",
      meaning: "Navy Sailor · Sailor",
      subjectType: SUBJECT_TYPES.vocabulary,
    });
  });

  it("remembers a kanji", () => {
    expect(recentHit(hit({}))?.href).toBe(`/kanji/${encodeURIComponent("水")}`);
  });

  it("remembers a radical by the page it opens", () => {
    const radical = hit({ subjectType: SUBJECT_TYPES.radical, glyph: "一", slug: "ground" });
    expect(recentHit(radical)?.href).toBe("/radicals/ground");
    expect(recentHit(radical)?.label).toBe("一");
  });

  it("remembers a search that was run", () => {
    expect(recentQuery("water")).toEqual({
      href: "/search?query=water",
      label: "water",
      meaning: null,
      subjectType: null,
    });
  });

  /*
   * A row with nowhere to go cannot be a history entry: it would be a line in
   * the list that does the same nothing the dead search rows used to do.
   */
  it("remembers nothing for a subject with no page", () => {
    expect(recentHit(hit({ subjectType: SUBJECT_TYPES.radical, slug: null }))).toBeNull();
    expect(recentQuery("   ")).toBeNull();
  });

  it("tells a subject apart from a search", () => {
    expect(isSubjectItem(recentHit(SAILOR)!)).toBe(true);
    expect(isSubjectItem(recentQuery("water")!)).toBe(false);
  });
});

describe("the list itself", () => {
  const word = recentHit(SAILOR)!;
  const kanji = recentHit(hit({}))!;
  const search = recentQuery("water")!;

  it("puts the newest first", () => {
    const list = addRecentItem(addRecentItem([], search), word);
    expect(list.map((item) => item.label)).toEqual(["水兵", "water"]);
  });

  /*
   * 水 the kanji and 水 the word are one character and two pages. Keyed on the
   * character, opening one would have quietly replaced the other.
   */
  it("keeps one character's kanji and word as two rows", () => {
    const vocabulary = recentHit(
      hit({ glyph: "水", subjectType: SUBJECT_TYPES.vocabulary, slug: "水", meaning: "Water" }),
    )!;
    const list = addRecentItem(addRecentItem([], kanji), vocabulary);
    expect(list).toHaveLength(2);
    expect(new Set(list.map((item) => item.href)).size).toBe(2);
  });

  it("moves a repeat to the front rather than listing it twice", () => {
    const list = addRecentItem(addRecentItem(addRecentItem([], word), kanji), word);
    expect(list.map((item) => item.label)).toEqual(["水兵", "水"]);
  });

  /* A search and the subject it led to are both worth keeping. */
  it("keeps searches and subjects in the same list", () => {
    const list = addRecentItem(addRecentItem([], search), word);
    expect(list.filter(isSubjectItem)).toHaveLength(1);
    expect(list.filter((item) => !isSubjectItem(item))).toHaveLength(1);
  });

  it("forgets one by its address", () => {
    const list = addRecentItem(addRecentItem([], word), kanji);
    expect(removeRecentItem(list, kanji.href).map((item) => item.label)).toEqual(["水兵"]);
  });

  it("stops growing at what it remembers", () => {
    let list: RecentItem[] = [];
    for (let index = 0; index < RECENT_ITEMS_MEMORY + 20; index += 1) {
      list = addRecentItem(list, recentQuery(`q${index}`));
    }
    expect(list).toHaveLength(RECENT_ITEMS_MEMORY);
    expect(list[0]!.label).toBe(`q${RECENT_ITEMS_MEMORY + 19}`);
  });
});

/**
 * The wiring, checked at the source.
 *
 * The store being right is not the feature: something has to call it when a
 * result is opened, and there is nowhere else in the codebase that would fail
 * if nobody did. Both ways into a subject are covered - the rows on the
 * results page and the suggestions under the box - because they are separate
 * code paths and the dropdown is the one that gets forgotten.
 */
const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("everything that opens a subject records it", () => {
  it("records a result row when it is opened", () => {
    const list = read("src/app/search/SearchHitList.tsx");
    /* The row link fires it, and what it fires is the store, not a local stub. */
    expect(list).toContain("onOpen={rememberHit}");
    expect(list).toMatch(/onClick=\{\(\) => onOpen\(hit\)\}/);
    expect(list).toContain('from "@/lib/recentItems"');
  });

  it("records a suggestion when it is picked", () => {
    const combobox = read("src/lib/useSearchCombobox.ts");
    expect(combobox).toContain("rememberHit(hit)");
  });

  it("still records the search that was run", () => {
    expect(read("src/app/shared/RecentItems.tsx")).toContain("rememberSearch(currentQuery)");
  });

  /*
   * One store, one key. The header dropdown, the phone sheet and the results
   * page are three views of the same history, and the way that breaks is a
   * second module appearing beside this one.
   */
  it("leaves no second history module behind", () => {
    const list = read("src/app/search/SearchHitList.tsx");
    const combobox = read("src/lib/useSearchCombobox.ts");
    const panel = read("src/app/shared/RecentItems.tsx");
    for (const source of [list, combobox, panel]) {
      expect(source).not.toContain("recentSearches");
    }
  });
});
