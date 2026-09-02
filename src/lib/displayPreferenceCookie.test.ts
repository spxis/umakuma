import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DISPLAY_PREFERENCE_COOKIES,
  readEnumCookie,
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
