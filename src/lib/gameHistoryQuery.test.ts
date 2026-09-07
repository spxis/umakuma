import { describe, expect, it } from "vitest";

import {
  GAME_HISTORY_DEFAULT_PAGE_SIZE,
  GAME_HISTORY_SORTS,
  GAME_HISTORY_SORT_DIRS,
  isGameHistorySort,
  parseGameHistoryQuery,
} from "./gameHistoryQuery";

const parse = (search: string) =>
  parseGameHistoryQuery(new URL(`https://umakuma.com/api/accounts/a/game/history${search}`));

describe("the game history query", () => {
  it("opens on the newest games, which is the question a record is asked first", () => {
    expect(parse("")).toEqual({
      kind: undefined,
      page: 1,
      pageSize: GAME_HISTORY_DEFAULT_PAGE_SIZE,
      sortBy: GAME_HISTORY_SORTS.played,
      sortDir: GAME_HISTORY_SORT_DIRS.desc,
    });
  });

  it("reads a full request", () => {
    expect(parse("?kind=daily&page=3&pageSize=50&sortBy=xp&sortDir=asc")).toEqual({
      kind: "daily",
      page: 3,
      pageSize: 50,
      sortBy: GAME_HISTORY_SORTS.xp,
      sortDir: GAME_HISTORY_SORT_DIRS.asc,
    });
  });

  /*
   * A query string is whatever anybody types. Every one of these used to be a
   * different way of asking the database for something silly - a negative
   * skip, a take of ten thousand, an ORDER BY on a column name from the URL.
   */
  it("refuses nonsense rather than passing it to the database", () => {
    expect(parse("?page=-4").page).toBe(1);
    expect(parse("?page=nope").page).toBe(1);
    expect(parse("?pageSize=0").pageSize).toBe(GAME_HISTORY_DEFAULT_PAGE_SIZE);
    expect(parse("?pageSize=100000").pageSize).toBe(100);
    expect(parse("?sortBy=xpAwarded; DROP TABLE").sortBy).toBe(GAME_HISTORY_SORTS.played);
    expect(parse("?sortDir=sideways").sortDir).toBe(GAME_HISTORY_SORT_DIRS.desc);
  });

  /* An unknown kind reaches the database as a filter that matches nothing,
     which is an empty table rather than an error - but it must not be
     unbounded text. */
  it("bounds the kind and drops an empty one", () => {
    expect(parse("?kind=").kind).toBeUndefined();
    expect(parse("?kind=%20%20").kind).toBeUndefined();
    expect(parse(`?kind=${"x".repeat(200)}`).kind).toHaveLength(40);
  });

  it("knows its own sort keys", () => {
    expect(isGameHistorySort("xp")).toBe(true);
    expect(isGameHistorySort("amount")).toBe(false);
    expect(isGameHistorySort(null)).toBe(false);
  });
});
