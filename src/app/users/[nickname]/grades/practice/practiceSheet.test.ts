import { describe, expect, it } from "vitest";

import { PRACTICE_PAGE_SIZE, PRACTICE_SHEET_COPY, TRACE_CELLS_PER_ROW } from "./practiceCopy";

const COLUMNS = 8;

describe("the tracing sheet's row", () => {
  /*
   * One solid square to copy, some faint ones to trace, then blanks to write
   * unaided. The three have to add up to the row or the grid tears.
   */
  it("fills a row exactly: one solid, the tracings, then blanks", () => {
    const blanks = COLUMNS - 1 - TRACE_CELLS_PER_ROW;
    expect(1 + TRACE_CELLS_PER_ROW + blanks).toBe(COLUMNS);
    expect(blanks).toBeGreaterThan(0);
  });

  it("leaves room to trace before writing unaided", () => {
    expect(TRACE_CELLS_PER_ROW).toBeGreaterThan(0);
    expect(TRACE_CELLS_PER_ROW).toBeLessThan(COLUMNS - 1);
  });
});

describe("the sheet's page", () => {
  it("keeps a printed page to a size that fits paper", () => {
    expect(PRACTICE_PAGE_SIZE).toBeGreaterThan(0);
    expect(PRACTICE_PAGE_SIZE).toBeLessThanOrEqual(30);
  });

  /*
   * KanjiVG is CC BY-SA, so the credit is a licence condition. A printed sheet
   * leaves the site entirely, which makes it the one place the attribution
   * must survive on its own.
   */
  it("carries the stroke-data credit onto the paper", () => {
    expect(PRACTICE_SHEET_COPY.credit).toContain("KanjiVG");
    expect(PRACTICE_SHEET_COPY.credit).toContain("CC BY-SA");
  });
});
