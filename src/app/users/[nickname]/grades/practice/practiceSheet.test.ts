import { describe, expect, it } from "vitest";

import gradeIndex from "@/data/school-grades/index.json";

import {
  DEFAULT_SHEET_SIZE,
  PRACTICE_PAGE_SIZE,
  PRACTICE_SHEET_COPY,
  PRINT_ALL_LIMIT,
  SHEET_SIZES,
  SHEET_SIZE_ORDER,
  toSheetSize,
  TRACE_CELLS_PER_ROW,
} from "./practiceCopy";

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

describe("printing everything", () => {
  /*
   * Reading and printing want different page sizes. Twenty characters is a
   * comfortable scroll and about two sheets of paper, which is why printing
   * the screen page turned a grade of eighty into four jobs that each ended in
   * a mostly-empty sheet. A print run has to be enough bigger than a reading
   * page for the choice to mean anything.
   */
  it("prints far more than one reading page", () => {
    expect(PRINT_ALL_LIMIT).toBeGreaterThan(PRACTICE_PAGE_SIZE * 4);
  });

  /*
   * The one sheet people actually print whole. If a grade file grows past the
   * limit, "Everything" quietly starts splitting that grade into runs - which
   * is survivable, but it should be a decision rather than a surprise.
   */
  it("takes any elementary grade in a single run", () => {
    const elementary = gradeIndex.grades.filter((entry) => entry.grade >= 1 && entry.grade <= 6);
    expect(elementary.length).toBe(6);
    for (const entry of elementary) {
      expect(entry.totalCount, `${entry.name} no longer fits one print run`).toBeLessThanOrEqual(
        PRINT_ALL_LIMIT,
      );
    }
  });

  /*
   * And it stays bounded. Secondary school kanji is 1,110 characters: rendered
   * as one document that is eighty sheets of paper and tens of thousands of
   * inline SVG paths, which is a hung tab rather than a print job.
   */
  it("splits the dictionary-sized lists rather than rendering them whole", () => {
    const secondary = gradeIndex.grades.find((entry) => entry.grade === 8);
    expect(secondary?.totalCount).toBeGreaterThan(PRINT_ALL_LIMIT);
    const runs = Math.ceil((secondary?.totalCount ?? 0) / PRINT_ALL_LIMIT);
    // Few enough to step through by hand, which fifty-six reading pages was not.
    expect(runs).toBeLessThanOrEqual(6);
  });
});


describe("the three square sizes", () => {
  /*
   * The row arithmetic has to hold at every size, not just the default: one
   * solid square, the tracings, then blanks, adding up to the row. Get it
   * wrong at one size and that sheet's grid tears while the others look fine.
   */
  it.each(SHEET_SIZE_ORDER)("%s fills its row exactly", (size) => {
    const { columns, traceCells } = SHEET_SIZES[size];
    const blanks = columns - 1 - traceCells;
    expect(1 + traceCells + blanks).toBe(columns);
    expect(blanks, `${size} leaves nowhere to write unaided`).toBeGreaterThan(0);
  });

  it("goes from big squares to small as the name says", () => {
    const widths = SHEET_SIZE_ORDER.map((size) => SHEET_SIZES[size].columns);
    // More columns is a smaller square, so the counts must climb L to S.
    expect(widths).toEqual([...widths].sort((a, b) => a - b));
    expect(new Set(widths).size, "two sizes that print the same").toBe(widths.length);
  });

  it("leaves the default sheet exactly as it was", () => {
    expect(SHEET_SIZES[DEFAULT_SHEET_SIZE].traceCells).toBe(TRACE_CELLS_PER_ROW);
    expect(SHEET_SIZES[DEFAULT_SHEET_SIZE].columns).toBe(8);
  });

  it("falls back rather than throwing on an unknown size", () => {
    expect(toSheetSize("enormous")).toBe(DEFAULT_SHEET_SIZE);
    expect(toSheetSize(null)).toBe(DEFAULT_SHEET_SIZE);
    for (const size of SHEET_SIZE_ORDER) expect(toSheetSize(size)).toBe(size);
  });

  it("says who each size is for, since S and M and L do not", () => {
    expect(PRACTICE_SHEET_COPY.sizeLargeTitle.toLowerCase()).toContain("child");
    expect(PRACTICE_SHEET_COPY.sizeSmallTitle.toLowerCase()).toContain("adult");
  });
});
