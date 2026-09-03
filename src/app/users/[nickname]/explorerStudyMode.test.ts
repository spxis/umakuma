import { describe, expect, it } from "vitest";

import { resolveStudyMode, STUDY_MODE_STORAGE_KEY } from "./explorerStudyMode";

function resolve(over: Partial<Parameters<typeof resolveStudyMode>[0]> = {}) {
  return resolveStudyMode({
    urlValue: null,
    storedValue: null,
    initialStudyMode: null,
    current: true,
    ...over,
  });
}

/*
 * Study mode could not be turned off by any means.
 *
 * The hook that held it returned `true` from its initialiser and ignored what
 * the page had resolved; answered `studyMode=off` and `studyMode=0` with
 * `setStudyMode(true)`, so the off switch turned it on; treated a stored value
 * of any kind, including the "0" it wrote itself, as on; and rewrote the
 * address to `studyMode=on` whatever the member chose. Every surface gated on
 * it stayed hidden - which is why the JLPT explorer always showed an ellipsis
 * where meanings and readings go, and never showed a kanji's compounds.
 */
describe("resolveStudyMode", () => {
  it("turns it on when the address says on", () => {
    expect(resolve({ urlValue: "on", current: false })).toBe(true);
    expect(resolve({ urlValue: "1", current: false })).toBe(true);
  });

  /* The one that was inverted: off used to return true. */
  it("turns it off when the address says off", () => {
    expect(resolve({ urlValue: "off", current: true })).toBe(false);
    expect(resolve({ urlValue: "0", current: true })).toBe(false);
  });

  it("lets the address beat both the memory and the page", () => {
    expect(resolve({ urlValue: "off", storedValue: "1", initialStudyMode: true })).toBe(false);
    expect(resolve({ urlValue: "on", storedValue: "0", initialStudyMode: false, current: false })).toBe(true);
  });

  it("reads the browser's memory when the address says nothing", () => {
    expect(resolve({ storedValue: "0", current: true })).toBe(false);
    expect(resolve({ storedValue: "1", current: false })).toBe(true);
  });

  /*
   * A stored "0" used to be read as on, because the old branch only checked
   * that something was stored - and the hook writes "0" itself, so choosing
   * off and reloading turned it back on.
   */
  it("does not read a stored 'off' as on merely because something is stored", () => {
    expect(resolve({ storedValue: "0", current: true })).toBe(false);
  });

  it("keeps what it has for a stored value it does not recognise", () => {
    expect(resolve({ storedValue: "yes", current: true })).toBe(true);
    expect(resolve({ storedValue: "", current: false })).toBe(false);
  });

  /* An address that already decided is not overruled by an older memory. */
  it("leaves a page-resolved choice alone rather than reapplying storage", () => {
    expect(resolve({ initialStudyMode: false, storedValue: "1", current: false })).toBe(false);
    expect(resolve({ initialStudyMode: true, storedValue: "0", current: true })).toBe(true);
  });

  it("changes nothing when nobody has an opinion", () => {
    expect(resolve({ current: true })).toBe(true);
    expect(resolve({ current: false })).toBe(false);
  });

  it("names the storage key the hook reads and writes", () => {
    expect(STUDY_MODE_STORAGE_KEY).toBe("wr:study-mode");
  });
});
