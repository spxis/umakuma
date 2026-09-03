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

const cells = (doc: Document) => doc.querySelectorAll('div[class*="aspect-square"]').length;

/*
 * The list sheets print a grid across many characters, a row each. This is the
 * other shape: one character taken apart, then the page ruled into squares.
 */
describe("a one-character practice sheet", () => {
  it("gives every stroke a square of its own, plus the finished character", () => {
    /* Four strokes: the model, then four steps. */
    expect(cells(draw(4))).toBe(1 + 4 + KANJI_SHEET_COLUMNS * KANJI_SHEET_PRACTICE_ROWS);
  });

  /*
   * A long character shows all of its steps rather than the first row of
   * them: the steps are the lesson the sheet carries.
   */
  it("does not stop at one row of steps for a long character", () => {
    expect(cells(draw(22))).toBe(1 + 22 + KANJI_SHEET_COLUMNS * KANJI_SHEET_PRACTICE_ROWS);
  });

  it("fills the rest of the page with empty squares", () => {
    const doc = draw(4);
    const empty = [...doc.querySelectorAll('div[class*="aspect-square"]')].filter(
      (cell) => cell.querySelector("svg") === null,
    );
    expect(empty).toHaveLength(KANJI_SHEET_COLUMNS * KANJI_SHEET_PRACTICE_ROWS);
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
