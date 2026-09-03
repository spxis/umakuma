import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

/*
 * Comments stripped before anything is asserted.
 *
 * The first version of this test read its own prose: the rules it looks for
 * are also *named* in the comments that explain them, so `indexOf("html,")`
 * landed inside a sentence about `html, body` and every assertion passed with
 * the actual CSS deleted. A guard that a comment can satisfy is not a guard.
 */
const code = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "");

const printCss = code(readFileSync(join(process.cwd(), "src/app/print.css"), "utf8"));
const printBlock = printCss.slice(printCss.indexOf("@media print"));

/*
 * Paper has no theme.
 *
 * The dark theme is a choice about a screen at night and it followed the page
 * onto paper: `--foreground` is #e7f0ff there, so a member reading in dark
 * mode printed near-white text onto white paper, having first spent the ink
 * laying a navy wash across it.
 *
 * Two separate failures, and the second is the one that hid the first. The
 * tokens are one override; the wash is four stacked gradients on `body` that
 * the dark theme replaces at `:root[data-theme="dark"] body`, and a plain
 * `html, body { background: #fff }` loses to that selector wherever it sits.
 * The computed styles said white while the PDF came out navy.
 */
describe("printing is never themed", () => {
  it("redefines the palette for print, including the dark theme's", () => {
    /* Both selectors: the dark block outranks a bare `:root` on its own. */
    expect(printBlock).toMatch(/:root,\s*\n\s*:root\[data-theme="dark"\]\s*\{/);

    const tokens = printBlock.slice(printBlock.indexOf(':root[data-theme="dark"] {'));
    for (const token of ["--background", "--foreground", "--surface", "--surface-muted"]) {
      expect(tokens, `${token} keeps its screen value on paper`).toContain(`${token}:`);
    }
  });

  /*
   * The gradients, at the specificity the theme set them. Without the
   * `:root[data-theme="dark"] body` selector here the wash prints; without
   * `background-image: none` it is only tinted.
   */
  it("removes the page wash at the selector that applied it", () => {
    expect(printBlock).toContain(':root[data-theme="dark"] body');
    const ground = printBlock.slice(printBlock.indexOf(':root[data-theme="dark"] body'));
    expect(ground).toMatch(/background-image:\s*none/);
  });

  /*
   * The dark theme must not introduce a colour the print block has not been
   * told about. Any token the dark block redefines is a token that reaches
   * paper differently from the light one, so each needs an answer here.
   */
  it("answers every token the dark theme redefines", () => {
    const themed = code(css);
    const darkBlock = themed.slice(themed.indexOf(':root[data-theme="dark"] {'));
    const darkTokens = new Set(
      (darkBlock.slice(0, darkBlock.indexOf("}")).match(/--[a-z0-9-]+(?=:)/g) ?? []),
    );
    expect(darkTokens.size).toBeGreaterThan(0);

    const printTokens = printBlock.slice(0, printBlock.indexOf("html,"));
    expect(printTokens).toContain("--foreground");
    for (const token of darkTokens) {
      expect(printTokens, `the dark theme changes ${token} and print says nothing about it`).toContain(`${token}:`);
    }
  });
});
