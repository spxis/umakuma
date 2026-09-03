import { describe, expect, it } from "vitest";

import { SHEET_SIZES, SHEET_SIZE_ORDER } from "./practiceCopy";
import { fillRowsPerEntry } from "./sheetFill";

/*
 * One sheet for a list and for a single character. A list gives each
 * character a row; filling the page shares its rows between whatever is on
 * it, so one kanji takes the whole page and two take half each.
 */
describe("fillRowsPerEntry", () => {
  it("gives one character the whole page", () => {
    expect(fillRowsPerEntry("medium", 1)).toBe(SHEET_SIZES.medium.rowsPerPage);
  });

  it("splits the page evenly between two", () => {
    expect(fillRowsPerEntry("medium", 2)).toBe(Math.floor(SHEET_SIZES.medium.rowsPerPage / 2));
  });

  it("never gives a character less than one row, however long the list", () => {
    expect(fillRowsPerEntry("small", 500)).toBe(1);
    expect(fillRowsPerEntry("large", 0)).toBe(SHEET_SIZES.large.rowsPerPage);
  });

  /* Smaller squares are shorter rows, so more of them fit down a page. */
  it("fits more rows on a page as the squares shrink", () => {
    const rows = SHEET_SIZE_ORDER.map((size) => SHEET_SIZES[size].rowsPerPage);
    expect(rows).toEqual([...rows].sort((a, b) => a - b));
    expect(new Set(rows).size).toBe(rows.length);
  });
});
