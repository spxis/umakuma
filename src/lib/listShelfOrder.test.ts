import { describe, expect, it } from "vitest";

import {
  LIST_SHELF_SORTS,
  clampPage,
  orderShelf,
  pageOfShelf,
  type ListShelfSort,
  type ShelfFacts,
} from "./listShelfOrder";

type Row = { name: string; count: number; updatedAt: string | null; holds?: string[] };

const facts = (row: Row): ShelfFacts => ({
  name: row.name,
  count: row.count,
  updatedAt: row.updatedAt,
  searchable: row.holds ?? [],
});

const SHELF: Row[] = [
  { name: "Week 1", count: 3, updatedAt: "2026-09-01T00:00:00.000Z", holds: ["水", "火"] },
  { name: "Kitchen kanji", count: 12, updatedAt: "2026-09-03T00:00:00.000Z", holds: ["皿"] },
  { name: "Week 2", count: 7, updatedAt: "2026-09-02T00:00:00.000Z", holds: ["土"] },
];

const order = (sort: ListShelfSort = LIST_SHELF_SORTS.updated, reversed = false, query = "") =>
  orderShelf(SHELF, facts, sort, reversed, query).map((row) => row.name);

describe("ordering a shelf", () => {
  it("puts the most recently changed first, which is what every shelf already did", () => {
    expect(order()).toEqual(["Kitchen kanji", "Week 2", "Week 1"]);
  });

  it("sorts by name and by size", () => {
    expect(order(LIST_SHELF_SORTS.name)).toEqual(["Kitchen kanji", "Week 1", "Week 2"]);
    expect(order(LIST_SHELF_SORTS.size)).toEqual(["Kitchen kanji", "Week 2", "Week 1"]);
  });

  /* Reversing is the same sort backwards, not a fourth sort. */
  it("reverses whichever sort is chosen", () => {
    expect(order(LIST_SHELF_SORTS.name, true)).toEqual(["Week 2", "Week 1", "Kitchen kanji"]);
  });

  /*
   * Two lists changed in the same second must not swap places between
   * renders, so every comparison falls through to the name.
   */
  it("breaks ties on the name, so the order is total", () => {
    const tied: Row[] = [
      { name: "Beta", count: 5, updatedAt: "2026-09-01T00:00:00.000Z" },
      { name: "Alpha", count: 5, updatedAt: "2026-09-01T00:00:00.000Z" },
    ];
    const names = (sort: ListShelfSort) =>
      orderShelf(tied, facts, sort, false, "").map((row) => row.name);
    expect(names(LIST_SHELF_SORTS.size)).toEqual(["Alpha", "Beta"]);
    expect(names(LIST_SHELF_SORTS.updated)).toEqual(["Alpha", "Beta"]);
  });

  it("puts a list that never said when it changed last, not first", () => {
    const withNull = [...SHELF, { name: "Ancient", count: 1, updatedAt: null }];
    expect(orderShelf(withNull, facts, LIST_SHELF_SORTS.updated, false, "").at(-1)?.name).toBe("Ancient");
  });
});

describe("searching a shelf", () => {
  it("matches the name, ignoring case", () => {
    expect(order(LIST_SHELF_SORTS.updated, false, "week")).toEqual(["Week 2", "Week 1"]);
  });

  /*
   * A member who remembers the kanji but not what they called the list. The
   * old shelf searched its items; the two shelves that had no search at all
   * now do the same thing.
   */
  it("matches what a list holds, not only what it is called", () => {
    expect(order(LIST_SHELF_SORTS.updated, false, "火")).toEqual(["Week 1"]);
  });

  it("trims the term, so a trailing space is not a different search", () => {
    expect(order(LIST_SHELF_SORTS.updated, false, "  week  ")).toEqual(["Week 2", "Week 1"]);
  });

  it("leaves the shelf alone when nothing was typed", () => {
    expect(order(LIST_SHELF_SORTS.updated, false, "   ")).toHaveLength(3);
  });
});

describe("paging a shelf", () => {
  const many = Array.from({ length: 50 }, (_, index) => index);

  it("cuts the shelf into pages and says how many there are", () => {
    const { rows, pageCount } = pageOfShelf(many, 2, 24);
    expect(pageCount).toBe(3);
    expect(rows).toHaveLength(24);
    expect(rows[0]).toBe(24);
  });

  /*
   * Typing into the search box on page four leaves the reader past the end of
   * a two-page result. Clamping is what stops that reading as "nothing
   * matched" when three things did.
   */
  it("brings a reader back from past the end", () => {
    const { rows, page } = pageOfShelf(many.slice(0, 3), 4, 24);
    expect(page).toBe(1);
    expect(rows).toHaveLength(3);
  });

  it("never goes below the first page", () => {
    expect(clampPage(0, 50, 24)).toBe(1);
    expect(clampPage(-3, 50, 24)).toBe(1);
  });

  /* An empty shelf is one page of nothing, not zero pages. */
  it("counts an empty shelf as a single page", () => {
    const { page, pageCount, rows } = pageOfShelf([], 1, 24);
    expect([page, pageCount, rows.length]).toEqual([1, 1, 0]);
  });
});
