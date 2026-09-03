import { describe, expect, it } from "vitest";

import { LIST_ITEM_SORTS, orderListItems, type ItemFacts, type ListItemSort } from "./listItemOrder";

type Item = { glyph: string; meaning: string; level: number | null };

const facts = (item: Item): ItemFacts => item;

/* Deliberately not in any sorted order: this is the order somebody arranged. */
const ITEMS: Item[] = [
  { glyph: "水", meaning: "water", level: 3 },
  { glyph: "火", meaning: "fire", level: 1 },
  { glyph: "鬱", meaning: "gloom", level: null },
  { glyph: "土", meaning: "dirt", level: 2 },
];

/* One item the catalogue has no meaning for, which several lists do hold. */
const WITH_NAMELESS: Item[] = [...ITEMS, { glyph: "分", meaning: "", level: 4 }];

const order = (sort: ListItemSort, reversed = false) =>
  orderListItems(ITEMS, facts, sort, reversed).map((item) => item.glyph);

describe("ordering what a list holds", () => {
  /*
   * The default is not "last changed" but the order the owner arranged, which
   * is the whole reason a copy appends rather than merges.
   */
  it("leaves the list in the order it keeps", () => {
    expect(order(LIST_ITEM_SORTS.order)).toEqual(["水", "火", "鬱", "土"]);
  });

  it("does not mutate the list it was given", () => {
    orderListItems(ITEMS, facts, LIST_ITEM_SORTS.meaning, false);
    expect(ITEMS.map((item) => item.glyph)).toEqual(["水", "火", "鬱", "土"]);
  });

  it("sorts by meaning", () => {
    expect(order(LIST_ITEM_SORTS.meaning)).toEqual(["土", "火", "鬱", "水"]);
  });

  /*
   * An item the catalogue has no meaning for is missing, not first. Sorting
   * the empty string alphabetically put a run of blanks at the top of the
   * page, which is the same mistake as floating an unplaced level there.
   */
  it("puts an item with no meaning last, both ways round", () => {
    const glyphs = (reversed: boolean) =>
      orderListItems(WITH_NAMELESS, facts, LIST_ITEM_SORTS.meaning, reversed).map((item) => item.glyph);
    expect(glyphs(false).at(-1)).toBe("分");
    expect(glyphs(true).at(-1)).toBe("分");
  });

  it("reverses the list's own order too", () => {
    expect(order(LIST_ITEM_SORTS.order, true)).toEqual(["土", "鬱", "火", "水"]);
  });

  /*
   * A level nobody knows is missing, not zero. Sorting it to the top would
   * put a column of blanks above everything the reader asked to see.
   */
  it("sorts by level and puts the unplaced last", () => {
    expect(order(LIST_ITEM_SORTS.level)).toEqual(["火", "土", "水", "鬱"]);
  });

  /*
   * Reversed means "highest level first", not "that list backwards". Turning
   * the whole array round floats every unplaced item to the top, which is the
   * one place "sort by level" cannot put something that has no level.
   */
  it("keeps the unplaced last even when the level sort is reversed", () => {
    expect(order(LIST_ITEM_SORTS.level, true)).toEqual(["水", "土", "火", "鬱"]);
  });
});
