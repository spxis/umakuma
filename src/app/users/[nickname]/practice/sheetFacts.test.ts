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
