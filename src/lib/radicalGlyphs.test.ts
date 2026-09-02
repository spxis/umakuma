import { describe, expect, it } from "vitest";

import { SUBJECT_TYPES } from "./domainConstants";
import {
  RADICAL_GLYPH_SLUGS,
  isPrivateUseGlyph,
  radicalGlyphForSlug,
  resolveSubjectGlyph,
} from "./radicalGlyphs";

/**
 * These are the fifteen radicals WaniKani ships without a character. The list
 * is asserted rather than derived so that regenerating the font cannot quietly
 * drop one: a slug that disappears from the map takes a radical back to
 * rendering the English word "tofu" in a review, which is the bug this fixes.
 */
const EXPECTED = [
  "beggar",
  "satellite",
  "rib-cage",
  "death-star",
  "cactus",
  "kick",
  "pope",
  "creeper",
  "elf",
  "yurt",
  "tofu",
  "explosion",
  "comb",
  "hills",
  "psychopath",
];

describe("radical glyphs", () => {
  it("covers every characterless WaniKani radical", () => {
    expect([...RADICAL_GLYPH_SLUGS].sort()).toEqual([...EXPECTED].sort());
  });

  it("gives each slug exactly one codepoint", () => {
    for (const slug of RADICAL_GLYPH_SLUGS) {
      const glyph = radicalGlyphForSlug(slug);
      expect(glyph, slug).toBeTruthy();
      expect([...(glyph ?? "")], slug).toHaveLength(1);
    }
  });

  /*
   * The nine that map to real characters must keep them: those render even
   * when the bundled font fails to load, and swapping one for a private-use
   * codepoint would trade a working glyph for a blank box.
   */
  it("keeps real Unicode characters for the nine that have them", () => {
    expect(radicalGlyphForSlug("beggar")).toBe("丂");
    expect(radicalGlyphForSlug("death-star")).toBe("俞");
    expect(radicalGlyphForSlug("cactus")).toBe("业");
    expect(radicalGlyphForSlug("satellite")).toBe("䍃");
    expect(radicalGlyphForSlug("rib-cage")).toBe("龶");
    expect(radicalGlyphForSlug("kick")).toBe(String.fromCodePoint(0x27607));
    expect(radicalGlyphForSlug("pope")).toBe(String.fromCodePoint(0x250ed));
    expect(radicalGlyphForSlug("creeper")).toBe(String.fromCodePoint(0x20b9b));
    expect(radicalGlyphForSlug("elf")).toBe(String.fromCodePoint(0x24bba));
  });

  it("uses private-use codepoints only for the six Unicode does not encode", () => {
    const private_ = RADICAL_GLYPH_SLUGS.filter((slug) => isPrivateUseGlyph(radicalGlyphForSlug(slug)));
    expect(private_.sort()).toEqual(["comb", "explosion", "hills", "psychopath", "tofu", "yurt"]);
  });

  it("does not collide: one codepoint is never used twice", () => {
    const glyphs = RADICAL_GLYPH_SLUGS.map((slug) => radicalGlyphForSlug(slug));
    expect(new Set(glyphs).size).toBe(glyphs.length);
  });

  it("returns null for a slug it does not carry", () => {
    expect(radicalGlyphForSlug("ground")).toBeNull();
    expect(radicalGlyphForSlug("")).toBeNull();
    expect(radicalGlyphForSlug(null)).toBeNull();
  });
});

describe("resolveSubjectGlyph", () => {
  it("prefers the characters the catalogue already holds", () => {
    expect(
      resolveSubjectGlyph({ subjectType: SUBJECT_TYPES.radical, characters: "一", slug: "ground" }),
    ).toBe("一");
  });

  it("fills in a characterless radical from its slug", () => {
    const glyph = resolveSubjectGlyph({ subjectType: SUBJECT_TYPES.radical, characters: null, slug: "tofu" });
    expect(glyph).toBe(radicalGlyphForSlug("tofu"));
    expect(isPrivateUseGlyph(glyph)).toBe(true);
  });

  /*
   * Only radicals arrive without characters. A kanji or vocabulary row with a
   * null glyph is a broken row, not one to look up by slug - "tofu" is a
   * radical slug and must never be matched against a vocabulary item.
   */
  it("never looks up a slug for kanji or vocabulary", () => {
    expect(resolveSubjectGlyph({ subjectType: SUBJECT_TYPES.kanji, characters: null, slug: "tofu" })).toBeNull();
    expect(
      resolveSubjectGlyph({ subjectType: SUBJECT_TYPES.vocabulary, characters: null, slug: "tofu" }),
    ).toBeNull();
  });

  it("returns null for a radical the font does not carry", () => {
    expect(
      resolveSubjectGlyph({ subjectType: SUBJECT_TYPES.radical, characters: null, slug: "worm-8786" }),
    ).toBeNull();
  });

  it("treats blank characters as absent", () => {
    expect(resolveSubjectGlyph({ subjectType: SUBJECT_TYPES.radical, characters: "   ", slug: "hills" })).toBe(
      radicalGlyphForSlug("hills"),
    );
  });
});
