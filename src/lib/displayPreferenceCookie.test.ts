import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_JP_FONT,
  DEFAULT_THEME,
  DISPLAY_PREFERENCE_ATTRIBUTES,
  DISPLAY_PREFERENCE_COOKIES,
  JP_FONT_MODES,
  readEnumCookie,
  THEME_MODES,
  writeDisplayPreferenceCookie,
} from "./displayPreferenceCookie";

const MODES = ["shown", "hidden"] as const;

describe("readEnumCookie", () => {
  it("takes a value the caller accepts", () => {
    expect(readEnumCookie("hidden", MODES, "shown")).toBe("hidden");
  });

  /*
   * The cookie is unsigned and a member can set anything, so an unknown value
   * has to fall back rather than reach a component that only handles two.
   */
  it("falls back for anything else", () => {
    expect(readEnumCookie(undefined, MODES, "shown")).toBe("shown");
    expect(readEnumCookie("", MODES, "shown")).toBe("shown");
    expect(readEnumCookie("HIDDEN", MODES, "shown")).toBe("shown");
    expect(readEnumCookie("../../etc/passwd", MODES, "shown")).toBe("shown");
  });

  it("does not treat inherited object keys as values", () => {
    expect(readEnumCookie("toString", MODES, "shown")).toBe("shown");
    expect(readEnumCookie("constructor", MODES, "shown")).toBe("shown");
  });
});

describe("writeDisplayPreferenceCookie", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("writes a path-wide cookie the next server render can read", () => {
    const written: string[] = [];
    vi.stubGlobal("document", {
      set cookie(value: string) {
        written.push(value);
      },
      get cookie() {
        return written.join("; ");
      },
    });

    writeDisplayPreferenceCookie(DISPLAY_PREFERENCE_COOKIES.gradeReveal, "hidden");

    expect(written).toHaveLength(1);
    expect(written[0]).toContain("wr-grades-reveal=hidden");
    expect(written[0]).toContain("Path=/");
    expect(written[0]).toContain("SameSite=Lax");
  });

  /*
   * The same module is imported by components that render on the server, so
   * touching `document` unconditionally would break the render rather than the
   * preference.
   */
  it("does nothing where there is no document", () => {
    vi.stubGlobal("document", undefined);
    expect(() => writeDisplayPreferenceCookie("wr-grades-reveal", "hidden")).not.toThrow();
  });
});

/*
 * The theme and the Japanese face decide the first paint of every page, so
 * they cannot be read a frame late. They were kept in localStorage and applied
 * by the profile page, the only page that mounts the control - so choosing
 * Dark applied there and nowhere else, and nothing read the stored value back
 * on load: the theme script the code referred to did not exist.
 */
describe("the look, on every page", () => {
  it("has a cookie for each attribute the root carries", () => {
    expect(DISPLAY_PREFERENCE_COOKIES.theme).toBe("wr-theme");
    expect(DISPLAY_PREFERENCE_COOKIES.jpFont).toBe("wr-jp-font");
    expect(Object.keys(DISPLAY_PREFERENCE_ATTRIBUTES)).toEqual(["theme", "jpFont"]);
  });

  it("draws light and sans when the browser has never said otherwise", () => {
    expect(readEnumCookie(undefined, THEME_MODES, DEFAULT_THEME)).toBe("light");
    expect(readEnumCookie(undefined, JP_FONT_MODES, DEFAULT_JP_FONT)).toBe("sans");
  });

  it("draws the chosen look when the cookie says so", () => {
    expect(readEnumCookie("dark", THEME_MODES, DEFAULT_THEME)).toBe("dark");
    expect(readEnumCookie("serif", JP_FONT_MODES, DEFAULT_JP_FONT)).toBe("serif");
  });

  /* The cookie is unsigned; a forged value must not reach the attribute. */
  it("falls back for anything that is not one of the two", () => {
    expect(readEnumCookie("Dark", THEME_MODES, DEFAULT_THEME)).toBe("light");
    expect(readEnumCookie('"><script>', THEME_MODES, DEFAULT_THEME)).toBe("light");
    expect(readEnumCookie("comic-sans", JP_FONT_MODES, DEFAULT_JP_FONT)).toBe("sans");
  });

  it("writes the theme where the next server render will read it", () => {
    const written: string[] = [];
    vi.stubGlobal("document", {
      set cookie(value: string) {
        written.push(value);
      },
      get cookie() {
        return written.join("; ");
      },
    });

    writeDisplayPreferenceCookie(DISPLAY_PREFERENCE_COOKIES.theme, "dark");
    expect(written[0]).toContain("wr-theme=dark");
    expect(written[0]).toContain("Path=/");
    vi.unstubAllGlobals();
  });
});
