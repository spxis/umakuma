import { describe, expect, it } from "vitest";

import { GRID_KEYS, isCell, isGridKey, nearColumnEnd, nextCell } from "./searchGrid";

/**
 * Walking a ragged grid of results.
 *
 * The columns are never the same length - a common character gives WaniKani
 * forty rows and the school grades one - so every sideways move is a move
 * between lists of different sizes. The bugs this shape invites are all the
 * same bug: a key that focuses nothing, so it reads as the keyboard being
 * broken. Every case here is a real one from a real search.
 */

/** 中: forty from WaniKani, two from JLPT, one grade, six in the dictionary. */
const RAGGED = [40, 2, 1, 6];

/** A search that only one catalogue answered. */
const LONE = [12];

describe("moving down and up", () => {
  it("walks down a column", () => {
    expect(nextCell(RAGGED, { column: 0, row: 3 }, GRID_KEYS.down)).toEqual({ column: 0, row: 4 });
  });

  /* Falling off the bottom stays put; there is nothing below the last row. */
  it("stops at the bottom rather than wrapping to the top", () => {
    expect(nextCell(RAGGED, { column: 2, row: 0 }, GRID_KEYS.down)).toBeNull();
    expect(nextCell(RAGGED, { column: 0, row: 39 }, GRID_KEYS.down)).toBeNull();
  });

  it("walks up a column", () => {
    expect(nextCell(RAGGED, { column: 0, row: 3 }, GRID_KEYS.up)).toEqual({ column: 0, row: 2 });
  });

  /*
   * Up off the top row is the way back to the box, from any column. It used to
   * be the only way back, which is what made a long column a trap.
   */
  it("leaves for the search box off the top of any column", () => {
    expect(nextCell(RAGGED, { column: 0, row: 0 }, GRID_KEYS.up)).toBe("input");
    expect(nextCell(RAGGED, { column: 3, row: 0 }, GRID_KEYS.up)).toBe("input");
  });
});

describe("moving between columns", () => {
  it("keeps the row where the next column is long enough", () => {
    expect(nextCell(RAGGED, { column: 0, row: 4 }, GRID_KEYS.right)).toEqual({ column: 1, row: 1 });
  });

  /*
   * The case the whole module exists for: right from row twenty into a column
   * of one. Landing on row twenty would focus nothing at all.
   */
  it("clamps to the last row where the next column is shorter", () => {
    expect(nextCell(RAGGED, { column: 0, row: 20 }, GRID_KEYS.right)).toEqual({ column: 1, row: 1 });
    expect(nextCell(RAGGED, { column: 1, row: 1 }, GRID_KEYS.right)).toEqual({ column: 2, row: 0 });
  });

  it("moves back left the same way", () => {
    expect(nextCell(RAGGED, { column: 3, row: 5 }, GRID_KEYS.left)).toEqual({ column: 2, row: 0 });
    expect(nextCell(RAGGED, { column: 1, row: 1 }, GRID_KEYS.left)).toEqual({ column: 0, row: 1 });
  });

  it("stops at the edges rather than wrapping around", () => {
    expect(nextCell(RAGGED, { column: 0, row: 2 }, GRID_KEYS.left)).toBeNull();
    expect(nextCell(RAGGED, { column: 3, row: 2 }, GRID_KEYS.right)).toBeNull();
  });

  /*
   * A column with nothing in it is not drawn, so stopping at it would be
   * stopping at a gap nobody can see - the key would just do nothing.
   */
  it("steps over an empty column instead of landing in it", () => {
    expect(nextCell([5, 0, 3], { column: 0, row: 1 }, GRID_KEYS.right)).toEqual({ column: 2, row: 1 });
    expect(nextCell([5, 0, 3], { column: 2, row: 2 }, GRID_KEYS.left)).toEqual({ column: 0, row: 2 });
  });

  it("refuses sideways when there is only one column", () => {
    expect(nextCell(LONE, { column: 0, row: 3 }, GRID_KEYS.right)).toBeNull();
    expect(nextCell(LONE, { column: 0, row: 3 }, GRID_KEYS.left)).toBeNull();
  });

  it("refuses every move from a column that holds nothing", () => {
    for (const key of Object.values(GRID_KEYS)) {
      expect(nextCell([0], { column: 0, row: 0 }, key)).toBeNull();
    }
  });
});

describe("the way out", () => {
  it("leaves for the box on Escape, from anywhere", () => {
    expect(nextCell(RAGGED, { column: 0, row: 39 }, GRID_KEYS.escape)).toBe("input");
    expect(nextCell(RAGGED, { column: 2, row: 0 }, GRID_KEYS.escape)).toBe("input");
  });

  it("takes Home to the top of the column, then out", () => {
    expect(nextCell(RAGGED, { column: 0, row: 20 }, GRID_KEYS.home)).toEqual({ column: 0, row: 0 });
    expect(nextCell(RAGGED, { column: 0, row: 0 }, GRID_KEYS.home)).toBe("input");
  });

  /* Home in a later column goes to that column's top, which is still on screen. */
  it("keeps Home inside its own column", () => {
    expect(nextCell(RAGGED, { column: 3, row: 4 }, GRID_KEYS.home)).toEqual({ column: 3, row: 0 });
  });
});

describe("asking for more rows", () => {
  it("asks as the end of the column comes near", () => {
    expect(nearColumnEnd(RAGGED, { column: 0, row: 37 }, 3)).toBe(true);
    expect(nearColumnEnd(RAGGED, { column: 0, row: 10 }, 3)).toBe(false);
  });

  /* Reaching the end of a short column is no reason to fetch more of a long one. */
  it("asks about the column being walked, not the page", () => {
    expect(nearColumnEnd(RAGGED, { column: 2, row: 0 }, 3)).toBe(true);
    expect(nearColumnEnd(RAGGED, { column: 0, row: 0 }, 3)).toBe(false);
  });
});

describe("which keys this answers for", () => {
  it("knows its own keys and nothing else", () => {
    for (const key of Object.values(GRID_KEYS)) expect(isGridKey(key)).toBe(true);
    expect(isGridKey("Enter")).toBe(false);
    expect(isGridKey("a")).toBe(false);
  });

  it("tells a cell from the other two answers", () => {
    expect(isCell({ column: 0, row: 0 })).toBe(true);
    expect(isCell("input")).toBe(false);
    expect(isCell(null)).toBe(false);
  });
});
