import { describe, expect, it } from "vitest";

import { GLYPH_CARD_SIZE_CLASS, GLYPH_ROW_SIZE_CLASS, glyphTextSizeClass } from "./glyphSizes";

/*
 * Three sizes, and the reason there is a test naming them is that there were
 * nine: a page heading clamping 5xl to 6xl, five row surfaces each spelling
 * text-2xl out in full with one drifted to sm:text-3xl, a proposal row at
 * text-xl and a note modal at text-4xl.
 */
describe("how big a glyph is", () => {
  it("measures the subject of a surface by its length", () => {
    expect(glyphTextSizeClass("水")).toContain("text-6xl");
    expect(glyphTextSizeClass("水曜")).toContain("text-6xl");
    expect(glyphTextSizeClass("水曜日")).toContain("text-5xl");
    /* A five-character word at a single character's size runs off a phone. */
    expect(glyphTextSizeClass("住宅宿泊事業")).toContain("text-4xl");
  });

  /* The marker rides along, so no surface takes the sizing and leaves the glyph translatable. */
  it("marks what it sizes as untranslatable", () => {
    expect(glyphTextSizeClass("水")).toContain("notranslate");
  });

  it("gives a row and a card one size each, not one per surface", () => {
    expect(GLYPH_ROW_SIZE_CLASS).toBe("text-2xl");
    expect(GLYPH_CARD_SIZE_CLASS).toBe("text-3xl");
    /* A card reads bigger than a row, or the density toggle says nothing. */
    expect(GLYPH_CARD_SIZE_CLASS).not.toBe(GLYPH_ROW_SIZE_CLASS);
  });
});
