import { describe, expect, it } from "vitest";

import { SEARCH_SOURCES, SEARCH_SOURCE_VALUES } from "./globalSearch";
import { SEARCH_KINDS, SEARCH_KIND_VALUES } from "./searchKinds";
import {
  NO_FILTERS,
  hasAnyFilter,
  isKept,
  onlySourceHref,
  parseSearchFilters,
  searchResultsHref,
  toggleKindHref,
  toggleSourceHref,
  toggleValue,
} from "./searchFilters";

/**
 * Turning parts of the results off.
 *
 * Two axes that answer different questions - which catalogue a row came from,
 * and whether it is a word, a kanji or a radical - so both are worth a chip.
 * The traps in a filter row are all quiet ones: a state with two addresses, a
 * click that empties the page with no way to tell that from finding nothing,
 * and a chip that reads as on while its rows are hidden.
 */

const ALL_KINDS = SEARCH_KIND_VALUES;
const ALL_SOURCES = SEARCH_SOURCE_VALUES;

const params = (search: string) => new URLSearchParams(search);

describe("reading the filters out of an address", () => {
  it("treats a plain address as everything showing", () => {
    expect(parseSearchFilters(params("query=水"))).toEqual(NO_FILTERS);
  });

  it("reads the kinds that were kept", () => {
    expect(parseSearchFilters(params("kinds=words,kanji")).kinds).toEqual(["words", "kanji"]);
  });

  it("reads the sources that were kept", () => {
    expect(parseSearchFilters(params("from=wanikani,jlpt")).sources).toEqual(["wanikani", "jlpt"]);
  });

  /*
   * One state, one address. Naming every kind is the same as naming none, and
   * two addresses that behave identically is how a back button starts lying.
   */
  it("writes naming them all as naming none", () => {
    expect(parseSearchFilters(params(`kinds=${ALL_KINDS.join(",")}`)).kinds).toEqual([]);
  });

  it("ignores a value it does not know, rather than filtering to nothing", () => {
    expect(parseSearchFilters(params("kinds=words,names")).kinds).toEqual(["words"]);
    expect(parseSearchFilters(params("kinds=names")).kinds).toEqual([]);
  });

  it("ignores a repeat", () => {
    expect(parseSearchFilters(params("kinds=words,words")).kinds).toEqual(["words"]);
  });
});

describe("what is showing", () => {
  it("shows everything while nothing is filtered", () => {
    for (const kind of ALL_KINDS) expect(isKept([], kind)).toBe(true);
  });

  it("shows only what was kept", () => {
    expect(isKept([SEARCH_KINDS.words], SEARCH_KINDS.words)).toBe(true);
    expect(isKept([SEARCH_KINDS.words], SEARCH_KINDS.kanji)).toBe(false);
  });
});

describe("clicking a chip", () => {
  it("turns one off, from everything on", () => {
    expect(toggleValue([], ALL_KINDS, SEARCH_KINDS.radicals)).toEqual(["words", "kanji"]);
  });

  it("turns it back on", () => {
    expect(toggleValue(["words", "kanji"], ALL_KINDS, SEARCH_KINDS.radicals)).toEqual([]);
  });

  /*
   * Turning the last one off would leave a page with nothing on it, and no way
   * to tell that from a search that found nothing. It turns everything back on
   * instead.
   */
  it("turns everything back on rather than emptying the page", () => {
    expect(toggleValue(["words"], ALL_KINDS, SEARCH_KINDS.words)).toEqual([]);
  });

  it("keeps a canonical order, so two routes to one state give one address", () => {
    const viaRadicals = toggleValue(toggleValue([], ALL_KINDS, "kanji"), ALL_KINDS, "radicals");
    const viaKanji = toggleValue(toggleValue([], ALL_KINDS, "radicals"), ALL_KINDS, "kanji");
    expect(viaRadicals).toEqual(viaKanji);
    expect(viaRadicals).toEqual(["words"]);
  });

  it("does the same for sources", () => {
    expect(toggleValue([], ALL_SOURCES, SEARCH_SOURCES.dictionary)).toEqual([
      "wanikani",
      "jlpt",
      "grades",
    ]);
  });
});

describe("the addresses the chips point at", () => {
  it("leaves a plain search plain", () => {
    expect(searchResultsHref("水", NO_FILTERS)).toBe(`/search?query=${encodeURIComponent("水")}`);
  });

  it("carries the filters that are on", () => {
    const href = searchResultsHref("水", { kinds: ["words"], sources: ["wanikani"] });
    expect(href).toContain("kinds=words");
    expect(href).toContain("from=wanikani");
  });

  it("flips one kind and leaves the sources alone", () => {
    const href = toggleKindHref("水", { kinds: [], sources: ["wanikani"] }, SEARCH_KINDS.radicals);
    expect(href).toContain("kinds=words%2Ckanji");
    expect(href).toContain("from=wanikani");
  });

  it("flips one source and leaves the kinds alone", () => {
    const href = toggleSourceHref("水", { kinds: ["words"], sources: [] }, SEARCH_SOURCES.jlpt);
    expect(href).toContain("kinds=words");
    expect(href).toContain("from=wanikani%2Cgrades%2Cdictionary");
  });

  /* A column's "more" link narrows to that column without touching the kinds. */
  it("opens one source on its own", () => {
    const href = onlySourceHref("水", { kinds: ["words"], sources: [] }, SEARCH_SOURCES.wanikani);
    expect(href).toContain("from=wanikani");
    expect(href).toContain("kinds=words");
  });

  /* Round-tripped rather than matched against one spelling: a query string
   * writes a space as `+`, which is correct and is not what encodeURIComponent
   * produces. What has to hold is that it reads back as what was typed. */
  it("escapes the query so it reads back as it was typed", () => {
    const href = searchResultsHref("日 sun", NO_FILTERS);
    expect(new URLSearchParams(href.split("?")[1]).get("query")).toBe("日 sun");
  });
});

describe("whether anything is filtered at all", () => {
  it("says no for a plain search and yes once a chip is off", () => {
    expect(hasAnyFilter(NO_FILTERS)).toBe(false);
    expect(hasAnyFilter({ kinds: ["words"], sources: [] })).toBe(true);
    expect(hasAnyFilter({ kinds: [], sources: ["jlpt"] })).toBe(true);
  });
});
