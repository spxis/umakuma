import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { SHEET_FACT_COPY } from "./practiceCopy";
import { sheetFactLabels } from "./sheetFacts";

const none = { schoolGrade: null, band: null, jlpt: null, wkLevel: null };

/*
 * John: we have other metadata a student benefits from when they look at kanji
 * on the sheet - the grade, the group, JLPT, WaniKani. One row for all of it,
 * so fill the row without making it busy.
 */
describe("what a worksheet row says about a character", () => {
  it("places it broadest first: grade, then the test, then the level", () => {
    expect(sheetFactLabels({ schoolGrade: 3, band: "ELEM", jlpt: 5, wkLevel: 17 })).toEqual([
      SHEET_FACT_COPY.grade(3),
      SHEET_FACT_COPY.jlpt(5),
      SHEET_FACT_COPY.wanikani(17),
    ]);
  });

  /*
   * School "years" 8 and 9 are not years - they are the secondary and name
   * registers - so the band is printed where a grade would be wrong.
   */
  it("names the band where there is no school year", () => {
    expect(sheetFactLabels({ ...none, band: "SEC" })).toEqual(["SEC"]);
    expect(sheetFactLabels({ schoolGrade: 3, band: "ELEM", jlpt: null, wkLevel: null })).toEqual([
      SHEET_FACT_COPY.grade(3),
    ]);
  });

  it("says only what is known, so an unknown character keeps a short line", () => {
    expect(sheetFactLabels(none)).toEqual([]);
    expect(sheetFactLabels(undefined)).toEqual([]);
    expect(sheetFactLabels({ ...none, jlpt: 1 })).toEqual([SHEET_FACT_COPY.jlpt(1)]);
  });

  /* Three at most, which is what "fill the row, do not fill it up" leaves. */
  it("never crowds the row with more than three", () => {
    expect(sheetFactLabels({ schoolGrade: 1, band: "ELEM", jlpt: 5, wkLevel: 2 })).toHaveLength(3);
  });
});

/*
 * On paper a sheet is finished; on screen it is a list of characters somebody
 * is working through, and every one of them was a dead end.
 */
describe("the character at the head of a row", () => {
  const source = readFileSync(
    join(process.cwd(), "src/app/users/[nickname]/practice/TracingSheet.tsx"),
    "utf8",
  );

  it("leads to that character's own page", () => {
    expect(source).toContain("kanjiPageHref(entry.kanji)");
    expect(source).toContain("OPEN_KANJI_TITLE(entry.kanji)");
  });

  /* Twenty underlined characters is a page of links; paper gets none at all. */
  it("shows the underline only when pointed at, and never on paper", () => {
    const row = source.slice(source.indexOf("<Link"), source.indexOf("</Link>"));
    expect(row).toContain("decoration-transparent");
    expect(row).toContain("hover:decoration-current");
    expect(row).toContain("print:no-underline");
  });
});
