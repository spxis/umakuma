import { describe, expect, it } from "vitest";

import { sweepSources, trackedSourceFiles } from "./sourceSweep";

/*
 * The helper the five source sweeps share. It exists because they had each
 * spelled the same git call out, and one of them was missing `-I` - so the
 * Open Graph PNGs under src/app came back as "Binary file ... matches", were
 * read as offenders, and took CI down on two releases while every local gate
 * stayed green.
 */
describe("sweeping the sources", () => {
  it("never reports a binary file, which is the bug it was built for", () => {
    /* `PNG` appears in the header bytes of every checked-in image. Without
       -I this finds them; with it, only the source that mentions the word. */
    for (const line of sweepSources("PNG", ["src/app"])) {
      expect(line, line).not.toMatch(/^Binary file/);
      expect(line).toMatch(/^src\/.*\.tsx?:\d+:/);
    }
  });

  it("leaves the tests themselves out, or every sweep finds its own rule", () => {
    for (const line of sweepSources("sweepSources", ["src"])) {
      expect(line, line).not.toMatch(/\.test\.tsx?:/);
    }
  });

  it("answers nothing rather than throwing when there is no match", () => {
    expect(sweepSources("zzz-nothing-matches-this-zzz", ["src"])).toEqual([]);
  });

  it("lists tracked sources without their tests", () => {
    const files = trackedSourceFiles();

    expect(files.length).toBeGreaterThan(100);
    expect(files.every((file) => /\.tsx?$/.test(file))).toBe(true);
    expect(files.some((file) => file.endsWith(".test.ts"))).toBe(false);
  });
});
