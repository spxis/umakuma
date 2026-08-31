import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The writing sheet is the one page meant to leave the screen, and everything
 * that makes it a worksheet rather than a screenshot lives in CSS nobody has a
 * reason to open. These are the pieces that were actually missing when print
 * mode was built, each of which fails silently on paper:
 *
 * - no `@page`, so the squares ran into the printer's unprintable edge;
 * - no colour adjustment, so the faint characters meant for tracing printed
 *   blank, which is the whole sheet gone;
 * - a site footer with a version number and a release codename under the
 *   twentieth kanji.
 *
 * None of it shows up on screen, so nothing else would catch its removal.
 */

const root = join(__dirname, "..", "..");
const globals = readFileSync(join(root, "src/app/globals.css"), "utf8");
const footer = readFileSync(join(root, "src/app/AppFooter.tsx"), "utf8");

describe("what the practice sheet does on paper", () => {
  it("sets a margin and an orientation", () => {
    expect(globals).toMatch(/@page\s*\{[^}]*margin:/i);
    expect(globals).toMatch(/@page\s*\{[^}]*size:\s*portrait/i);
  });

  /*
   * Naming the paper overrides the printer. The sheet pinned `letter portrait`
   * on the reasoning that its readers are Canadian and American - true, and
   * still the wrong place to decide it: asking Chrome for A4 produced a
   * 612x792 Letter page, so an A4 sheet came out with Letter geometry scaled
   * inside it. The squares are `fr` units and fit whatever paper arrives.
   */
  it("leaves the paper size to whatever is in the printer", () => {
    const pageRule = globals.match(/@page\s*\{[^}]*\}/i)?.[0] ?? "";
    expect(pageRule).not.toMatch(/\b(letter|a4|a3|legal)\b/i);
  });

  it("keeps grey grey, so the tracing characters print at all", () => {
    expect(globals).toMatch(/print-color-adjust:\s*exact/);
  });

  it("takes the site footer off the page", () => {
    expect(globals).toMatch(/\[data-print="hide"\][\s\S]{0,80}display:\s*none/);
    expect(footer).toContain('data-print="hide"');
  });

  it("does not split a character across a page break", () => {
    expect(globals).toMatch(/@media print[\s\S]*break-inside:\s*avoid/);
  });
});
