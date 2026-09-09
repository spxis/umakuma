import { describe, expect, it } from "vitest";

import {
  DEFAULT_THEME_WORD_MODE,
  THEME_WORD_MODES,
  THEME_WORD_MODE_VALUES,
  isThemeWordMode,
  themeLeadIsJapanese,
} from "./themeWords";

describe("themeWords", () => {
  it("leads in romaji until a member says otherwise", () => {
    /* The whole point of the ticket: a member meets their theme on the
       settings page before they can read it. */
    expect(DEFAULT_THEME_WORD_MODE).toBe(THEME_WORD_MODES.romaji);
    expect(themeLeadIsJapanese(DEFAULT_THEME_WORD_MODE)).toBe(false);
  });

  it("puts the Japanese first only in the Japanese mode", () => {
    expect(themeLeadIsJapanese(THEME_WORD_MODES.japanese)).toBe(true);
    expect(themeLeadIsJapanese(THEME_WORD_MODES.romaji)).toBe(false);
  });

  it("offers two modes and recognises exactly those", () => {
    expect(THEME_WORD_MODE_VALUES).toEqual(["romaji", "japanese"]);
    expect(isThemeWordMode("romaji")).toBe(true);
    expect(isThemeWordMode("japanese")).toBe(true);
    expect(isThemeWordMode("english")).toBe(false);
  });
});
