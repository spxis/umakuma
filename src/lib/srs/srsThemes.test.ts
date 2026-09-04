import { describe, expect, it } from "vitest";

import {
  DEFAULT_SRS_THEME_ID,
  SRS_THEME_RATINGS,
  srsTheme,
  srsThemeLevel,
  srsThemes,
  srsThemesFor,
} from "./srsThemes";

/**
 * The themes are display over the same nine stages, so what has to hold is
 * that every one of them can name every stage, that a chip fits, and that a
 * rating never lets something through that a child should not see.
 */
describe("the SRS themes", () => {
  const themes = srsThemes();

  it("names every stage from not-started to the top", () => {
    expect(themes.length).toBeGreaterThan(50);
    for (const theme of themes) {
      expect(theme.levels.map((level) => level.level), theme.id).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      for (const level of theme.levels) {
        expect(level.term.length, `${theme.id} L${level.level}`).toBeGreaterThan(0);
        expect(level.reading.length, `${theme.id} L${level.level}`).toBeGreaterThan(0);
        expect(level.meaning.length, `${theme.id} L${level.level}`).toBeGreaterThan(0);
      }
    }
  });

  /* A pill is narrow. A chip that overflows is worse than a shorter word. */
  it("gives every stage a name that fits a chip", () => {
    for (const theme of themes) {
      for (const level of theme.levels) {
        const width = [...level.short].length;
        /* Latin runs are narrow enough to allow a couple more. */
        const limit = /^[A-Za-z0-9 .-]+$/.test(level.short) ? 8 : 5;
        expect(width, `${theme.id} L${level.level} "${level.short}"`).toBeLessThanOrEqual(limit);
      }
    }
  });

  it("has a default that exists, and falls back rather than throwing", () => {
    expect(srsTheme(DEFAULT_SRS_THEME_ID).id).toBe(DEFAULT_SRS_THEME_ID);
    expect(srsTheme("no-such-theme").id).toBe(DEFAULT_SRS_THEME_ID);
    expect(srsTheme(null).id).toBe(DEFAULT_SRS_THEME_ID);
  });

  it("names a stage, and calls stage 0 not-started", () => {
    const judo = srsTheme("judo");
    expect(srsThemeLevel(judo, 1).reading).toBe("Shiro-obi");
    expect(srsThemeLevel(judo, 9).reading).toBe("Kō-obi");
    expect(srsThemeLevel(judo, 0).meaning).toBe("Not started");
    /* An out-of-range stage reads as not-started rather than blank. */
    expect(srsThemeLevel(judo, 99).level).toBe(0);
  });

  /*
   * The rating is a floor. An account with no age recorded gets `all`, because
   * guessing upward is the only mistake here that reaches a child.
   */
  it("shows a child only what is fine for anybody", () => {
    const forChildren = srsThemesFor(SRS_THEME_RATINGS.all);
    expect(forChildren.every((theme) => theme.rating === SRS_THEME_RATINGS.all)).toBe(true);
    expect(forChildren.length).toBeLessThan(themes.length);

    const forTeens = srsThemesFor(SRS_THEME_RATINGS.teen);
    expect(forTeens.some((theme) => theme.rating === SRS_THEME_RATINGS.adult)).toBe(false);
    expect(srsThemesFor(SRS_THEME_RATINGS.adult)).toHaveLength(themes.length);
  });

  it("keeps organised crime and the sex trade out of the child list", () => {
    const childIds = new Set(srsThemesFor(SRS_THEME_RATINGS.all).map((theme) => theme.id));
    for (const id of ["like-a-dragon-yakuza", "gokudo-yakuza", "yoshiwara-oiran", "mizushobai-kabukicho"]) {
      expect(childIds.has(id), `${id} must not be offered to a child`).toBe(false);
    }
  });

  /*
   * Rank vocabulary is ordinary Japanese and stays. A *title* is a trademark,
   * so no theme ships under the name of the work it came from.
   */
  it("ships no theme under a trademarked title", () => {
    const names = themes.map((theme) => theme.name.toLowerCase());
    for (const mark of ["naruto", "one piece", "bleach", "demon slayer", "pokemon", "pokémon", "star wars", "gundam", "zelda", "mario"]) {
      expect(names, `a theme is still called "${mark}"`).not.toContain(mark);
    }
    /* And the ladders survived the rename. */
    expect(srsTheme("naruto").name).toBe("Shinobi Ranks");
    expect(srsThemeLevel(srsTheme("naruto"), 7).reading).toBe("Jōnin");
  });

  it("gives every theme a unique id and name", () => {
    expect(new Set(themes.map((theme) => theme.id)).size).toBe(themes.length);
    expect(new Set(themes.map((theme) => theme.name)).size).toBe(themes.length);
  });
});
