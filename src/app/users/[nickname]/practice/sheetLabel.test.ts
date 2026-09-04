import { describe, expect, it } from "vitest";

import { PRACTICE_SOURCES } from "@/lib/practiceSourceKinds";

import { PRACTICE_SHEET_COPY } from "./practiceCopy";
import { sheetLabelFor } from "./sheetOptions";

const picked = { source: PRACTICE_SOURCES.picked, level: 1, grade: 1 } as const;
const entry = (kanji: string, meaning: string | null) => ({ kanji, meaning });

/*
 * John, on a worksheet holding one character: the "Writing practice · Chosen
 * characters" title is wrong, it could mention that kanji. "Chosen characters"
 * is true of every hand-picked sheet and says nothing about this one - and the
 * commonest hand-picked sheet of all is the one a character's own page links
 * to, which holds that character alone.
 */
describe("what a sheet is called", () => {
  /*
   * The character alone: the heading reads "Writing practice · X", so a
   * meaning after it makes two middle dots in one line, and the row under it
   * carries the meaning and the stroke count already.
   */
  it("names the character when the sheet is one character", () => {
    expect(sheetLabelFor(picked, null, [entry("統", "Unite")])).toBe("統");
    expect(sheetLabelFor(picked, null, [entry("兀", null)])).toBe("兀");
  });

  it("counts them when several were chosen", () => {
    const label = sheetLabelFor(picked, null, [entry("統", "Unite"), entry("倫", "Ethics")]);
    expect(label).toBe(PRACTICE_SHEET_COPY.fromPickedCount(2));
  });

  /* Nothing on it yet is still a hand-picked sheet. */
  it("keeps the general name when there is nothing to name", () => {
    expect(sheetLabelFor(picked, null, [])).toBe(PRACTICE_SHEET_COPY.fromPicked);
  });

  /* Every other sheet is named after the collection, which has not changed. */
  it("leaves the other sheets alone", () => {
    expect(sheetLabelFor({ source: PRACTICE_SOURCES.jlpt, level: 5, grade: 1 } as const, null)).toBe("JLPT N5");
    expect(sheetLabelFor({ source: PRACTICE_SOURCES.wanikani, level: 17, grade: 1 } as const, null)).toBe("WaniKani L17");
    expect(sheetLabelFor({ source: PRACTICE_SOURCES.list, level: 1, grade: 1 } as const, "Week 2")).toBe("Week 2");
    expect(sheetLabelFor({ source: PRACTICE_SOURCES.trouble, level: 1, grade: 1 } as const, null)).toBe(
      PRACTICE_SHEET_COPY.fromTrouble,
    );
  });
});
