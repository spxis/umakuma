import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { AGE_BANDS, AGE_BAND_VALUES, isAgeBand, ratingFor } from "./ageBand";
import { SRS_THEME_RATINGS, srsThemesFor } from "./srsThemes";

/**
 * The only thing UmaKuma wants from age is whether to offer the themes about
 * organised crime, the sex trade and gambling. Getting that wrong in the
 * permissive direction puts them in front of a child, so the default is the
 * safe answer rather than the convenient one.
 */
describe("what an age band may be shown", () => {
  it("treats an account that has never said as the youngest", () => {
    expect(ratingFor(null)).toBe(SRS_THEME_RATINGS.all);
    expect(ratingFor(undefined)).toBe(SRS_THEME_RATINGS.all);
    /* Including a value that is not a band at all. */
    expect(ratingFor("grown-up")).toBe(SRS_THEME_RATINGS.all);
    expect(ratingFor("")).toBe(SRS_THEME_RATINGS.all);
  });

  it("opens each rating to the band it belongs to and no further", () => {
    expect(ratingFor(AGE_BANDS.under13)).toBe(SRS_THEME_RATINGS.all);
    expect(ratingFor(AGE_BANDS.teen)).toBe(SRS_THEME_RATINGS.teen);
    expect(ratingFor(AGE_BANDS.adult)).toBe(SRS_THEME_RATINGS.adult);
  });

  it("keeps the adult themes away from anybody under eighteen", () => {
    for (const band of [null, AGE_BANDS.under13, AGE_BANDS.teen]) {
      const offered = srsThemesFor(ratingFor(band));
      expect(offered.some((theme) => theme.rating === SRS_THEME_RATINGS.adult), `band ${band}`).toBe(false);
    }
    expect(srsThemesFor(ratingFor(AGE_BANDS.adult)).some((theme) => theme.rating === SRS_THEME_RATINGS.adult)).toBe(true);
  });

  it("keeps horror away from a child but not from a teenager", () => {
    expect(srsThemesFor(ratingFor(AGE_BANDS.under13)).some((t) => t.rating === SRS_THEME_RATINGS.teen)).toBe(false);
    expect(srsThemesFor(ratingFor(AGE_BANDS.teen)).some((t) => t.rating === SRS_THEME_RATINGS.teen)).toBe(true);
  });

  it("recognises only the three bands", () => {
    expect(AGE_BAND_VALUES).toEqual(["under_13", "13_17", "18_plus"]);
    for (const band of AGE_BAND_VALUES) expect(isAgeBand(band)).toBe(true);
    for (const other of ["adult", "18", "", null, 18]) expect(isAgeBand(other)).toBe(false);
  });

  /*
   * The route reads the band before it writes the theme, so setting a band can
   * take a theme away as well as offer one. If those ever swap order, a member
   * could keep a theme their new band may not see.
   */
  it("resolves the band before it saves the theme", () => {
    const route = readFileSync(join(process.cwd(), "src/app/api/accounts/[id]/theme/route.ts"), "utf8");
    expect(route.indexOf("ageBand")).toBeLessThan(route.indexOf("saveMemberTheme"));
    expect(route).toContain("canAccessAccount");
  });

  /* The picker asks for a band, never a birthdate. */
  it("stores a band and not a date of birth", () => {
    const schema = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8");
    expect(schema).toContain("ageBand");
    expect(schema).not.toContain("dateOfBirth");
    expect(schema).not.toContain("birthdate");
  });
});
