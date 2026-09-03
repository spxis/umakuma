import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SHEET_SIZES } from "./practiceCopy";
import { INK_GHOST, INK_SOLID } from "./sheetCells";
import TracingSheet, { type TraceEntry } from "./TracingSheet";

/* Twelve strokes, so the chart takes two rows before the practice begins. */
const entry: TraceEntry = {
  kanji: "統",
  meaning: "unite",
  on: [],
  kun: [],
  strokes: Array.from({ length: 12 }, (_, index) => `M0 ${index}L10 ${index}`),
  strokeCount: 12,
  viewBox: "0 0 109 109",
};

const { columns } = SHEET_SIZES.medium;

function cells(node: Parameters<typeof renderToStaticMarkup>[0]): Element[] {
  const document = new JSDOM(`<!doctype html><body>${renderToStaticMarkup(node)}</body>`).window.document;
  const grid = document.querySelector('[style*="grid-template-columns"]')!;
  return [...grid.children];
}

/** The character in a square, as one class: `g` for a whole glyph, `path` for a step. */
function ink(cell: Element): string {
  return cell.querySelector("svg g")?.getAttribute("class") ?? "";
}

/*
 * One column, one weight.
 *
 * The leftmost square of every row on a stroke sheet holds the finished
 * character. On the chart rows it was drawn faint and on the practice rows
 * below it solid, so a page showed the same character at two weights down a
 * single column - which reads as a mistake, whatever the reasoning was.
 */
describe("the model character down the left of a stroke sheet", () => {
  it("is solid on every row, chart and practice alike", () => {
    const rows = cells(<TracingSheet entries={[entry]} mode="strokes" size="medium" rowsPerEntry={9} />);
    expect(rows.length).toBe(9 * columns);

    for (let at = 0; at < rows.length; at += columns) {
      expect(ink(rows[at]!), `row ${at / columns + 1} leads with faint ink`).toContain(INK_SOLID);
    }
  });

  /* The squares beside it stay faint: they are the ones to trace over. */
  it("keeps the tracing squares faint", () => {
    const rows = cells(<TracingSheet entries={[entry]} mode="strokes" size="medium" rowsPerEntry={9} />);
    /* Row three is the first practice row: chart, chart, then the work. */
    expect(ink(rows[2 * columns + 1]!)).toContain(INK_GHOST);
  });

  /* Turned off, the first square is another one to trace, not a solid one. */
  it("draws no solid model when the reader has turned it off", () => {
    const rows = cells(
      <TracingSheet entries={[entry]} mode="strokes" size="medium" rowsPerEntry={9} showModel={false} />,
    );
    for (let at = 0; at < rows.length; at += columns) {
      expect(ink(rows[at]!)).not.toContain(INK_SOLID);
    }
  });
});
