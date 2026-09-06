import { describe, expect, it } from "vitest";

import {
  XP_HISTORY_DEFAULT_PAGE_SIZE,
  XP_HISTORY_SORTS,
  isXpHistorySort,
  parseXpHistoryQuery,
} from "./xpHistoryQuery";

const parse = (search: string) => parseXpHistoryQuery(new URL(`https://x.test/api?${search}`));

describe("reading an XP history query off the URL", () => {
  it("defaults to the newest day first, page one", () => {
    const query = parse("");

    expect(query).toMatchObject({
      page: 1,
      pageSize: XP_HISTORY_DEFAULT_PAGE_SIZE,
      sortBy: XP_HISTORY_SORTS.day,
      sortDir: "desc",
    });
    expect(query.kind).toBeUndefined();
  });

  it("takes a sort, a direction, a page and a size", () => {
    expect(parse("sortBy=amount&sortDir=asc&page=3&pageSize=50")).toMatchObject({
      sortBy: XP_HISTORY_SORTS.amount,
      sortDir: "asc",
      page: 3,
      pageSize: 50,
    });
  });

  /* A query string is whatever somebody typed, so every field falls back
     rather than throwing - a bad sort key must not 500 a member's history. */
  it("falls back on nonsense rather than failing", () => {
    expect(parse("sortBy=heaviest&sortDir=sideways&page=-4&pageSize=0")).toMatchObject({
      sortBy: XP_HISTORY_SORTS.day,
      sortDir: "desc",
      page: 1,
      pageSize: XP_HISTORY_DEFAULT_PAGE_SIZE,
    });
  });

  /* The cap is the protection: a page size is a promise about one query's
     cost, and `pageSize=100000` would be a member DoSing their own history. */
  it("caps the page size at a hundred", () => {
    expect(parse("pageSize=100000").pageSize).toBe(100);
  });

  it("keeps a kind filter, and drops an empty one", () => {
    expect(parse("kind=review").kind).toBe("review");
    expect(parse("kind=").kind).toBeUndefined();
    expect(parse("kind=%20%20").kind).toBeUndefined();
  });

  it("truncates an absurd kind rather than passing it to the database", () => {
    expect(parse(`kind=${"x".repeat(500)}`).kind).toHaveLength(80);
  });

  it("knows its own sort keys", () => {
    expect(isXpHistorySort("day")).toBe(true);
    expect(isXpHistorySort("amount")).toBe(true);
    expect(isXpHistorySort("kind")).toBe(true);
    expect(isXpHistorySort("streak")).toBe(false);
    expect(isXpHistorySort(null)).toBe(false);
  });
});
