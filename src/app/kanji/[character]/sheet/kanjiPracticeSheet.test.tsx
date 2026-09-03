import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import KanjiPracticeSheet from "./KanjiPracticeSheet";
import {
  KANJI_SHEET_COLUMNS,
  KANJI_SHEET_COPY,
  KANJI_SHEET_PRACTICE_ROWS,
} from "./kanjiSheetCopy";
import { kanjiSheetHref } from "./kanjiSheetAddress";

function entry(strokeCount: number) {
  return {
    kanji: "水",
    meaning: "Water",
    on: ["スイ"],
    kun: ["みず"],
    strokes: Array.from({ length: strokeCount }, (_, index) => `M0 ${index} L10 ${index}`),
    strokeCount,
    viewBox: "0 0 109 109",
  };
}

function draw(strokeCount: number): Document {
  const markup = renderToStaticMarkup(<KanjiPracticeSheet entry={entry(strokeCount)} />);
  return new JSDOM(`<!doctype html><body>${markup}</body>`).window.document;
}

/*
 * The list sheets print a grid across many characters, a row each. This is the
 * other shape: one character taken apart, then the page ruled into squares.
 */
describe("a one-character practice sheet", () => {
  /* The chart: the model, then a square per stroke. */
  it("gives every stroke a square of its own, plus the finished character", () => {
    const chart = draw(4).querySelectorAll("section")[0];
    expect(chart.querySelectorAll('div[class*="aspect-square"]')).toHaveLength(1 + 4);
  });

  /*
   * A long character shows all of its steps rather than the first row of
   * them: the steps are the lesson the sheet carries.
   */
  it("does not stop at one row of steps for a long character", () => {
    const chart = draw(22).querySelectorAll("section")[0];
    expect(chart.querySelectorAll('div[class*="aspect-square"]')).toHaveLength(1 + 22);
  });

  /*
   * A workbook leads the hand before it lets go: the first practice row is
   * the character built stroke by stroke in faint, then every row opens with
   * the finished character in faint before the blanks.
   */
  it("opens the practice with the build in faint, padded to a full row", () => {
    const practice = draw(4).querySelectorAll("section")[1];
    const squares = [...practice.querySelectorAll('div[class*="aspect-square"]')];
    const guideRow = squares.slice(0, KANJI_SHEET_COLUMNS);
    expect(guideRow.filter((cell) => cell.querySelector("svg"))).toHaveLength(4);
    expect(guideRow.filter((cell) => !cell.querySelector("svg"))).toHaveLength(KANJI_SHEET_COLUMNS - 4);
  });

  it("starts every practice row with the faint character, then blanks", () => {
    const practice = draw(4).querySelectorAll("section")[1];
    const squares = [...practice.querySelectorAll('div[class*="aspect-square"]')].slice(KANJI_SHEET_COLUMNS);
    expect(squares).toHaveLength(KANJI_SHEET_COLUMNS * KANJI_SHEET_PRACTICE_ROWS);
    for (let row = 0; row < KANJI_SHEET_PRACTICE_ROWS; row += 1) {
      const line = squares.slice(row * KANJI_SHEET_COLUMNS, (row + 1) * KANJI_SHEET_COLUMNS);
      expect(line[0].querySelector("svg"), `row ${row} model`).not.toBeNull();
      expect(line.slice(1).every((cell) => cell.querySelector("svg") === null), `row ${row} blanks`).toBe(true);
    }
  });

  /* Below the chart every mark is something to trace; a black one would be
   * the only thing on the page not to. */
  it("puts no solid ink anywhere in the practice rows", () => {
    const practice = draw(22).querySelectorAll("section")[1];
    /* The heading is muted foreground too; only the drawn paths matter here. */
    expect(practice.querySelectorAll('svg [class*="text-foreground"]')).toHaveLength(0);
  });

  it("says what each half of the sheet is for", () => {
    const text = draw(4).body.textContent ?? "";
    expect(text).toContain(KANJI_SHEET_COPY.strokeHeading);
    expect(text).toContain(KANJI_SHEET_COPY.practiceHeading);
  });
});

/*
 * A static segment beside the character page's optional catch-all, which Next
 * resolves first - so the stroke-order section keeps its own address.
 */
describe("where the sheet lives", () => {
  it("hangs off the character, encoded for a URL", () => {
    expect(kanjiSheetHref("水")).toBe("/kanji/%E6%B0%B4/sheet");
    expect(kanjiSheetHref("驚")).toBe("/kanji/%E9%A9%9A/sheet");
  });
});
