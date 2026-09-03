import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

/*
 * Comments stripped before anything is asserted.
 *
 * The first version of this test read its own prose: the rules it looks for
 * are also named in the comments explaining them, so `indexOf` landed inside
 * a sentence and every assertion passed with the actual CSS deleted. A guard
 * a comment can satisfy is not a guard.
 */
const code = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "");

const printCss = code(readFileSync(join(process.cwd(), "src/app/print.css"), "utf8"));
const printBlock = printCss.slice(printCss.indexOf("@media print"));

/**
 * Paper is the light theme, and nothing else changes.
 *
 * The dark theme is a choice about a screen at night and it followed the page
 * onto paper: near-white text on white paper, over a navy wash that had
 * already been laid down in ink.
 *
 * The fix restores the light values and stops there. An earlier attempt
 * flattened every brand colour to black and forced all text black, which
 * answered a question nobody asked - it turned filled pills into solid
 * lozenges and used more ink than the page it was sparing.
 */
describe("printing is the light theme", () => {
  /** What the dark theme changes is exactly what print has to change back. */
  const darkBlock = (() => {
    const themed = code(css);
    const at = themed.indexOf(':root[data-theme="dark"] {');
    return themed.slice(at, themed.indexOf("}", at));
  })();

  const lightBlock = (() => {
    const themed = code(css);
    const at = themed.indexOf(":root {");
    return themed.slice(at, themed.indexOf("}", at));
  })();

  const printTokens = printBlock.slice(
    printBlock.indexOf(':root[data-theme="dark"] {'),
    printBlock.indexOf("html,"),
  );

  it("restores every token the dark theme overrides", () => {
    const darkTokens = darkBlock.match(/--[a-z0-9-]+(?=:)/g) ?? [];
    expect(darkTokens.length).toBeGreaterThan(0);
    for (const token of darkTokens) {
      expect(printTokens, `the dark theme changes ${token} and print says nothing about it`).toContain(`${token}:`);
    }
  });

  /*
   * To the light theme's own values, not to invented ones. This is what stops
   * the file drifting back into a printing palette of its own.
   */
  it("restores them to the values :root already gives", () => {
    for (const [, token, value] of printTokens.matchAll(/(--[a-z0-9-]+):\s*([^;!]+)/g)) {
      const light = new RegExp(`${token}:\\s*([^;]+);`).exec(lightBlock);
      expect(light, `${token} is set for print but not by :root`).not.toBeNull();
      expect(value.trim(), `print gives ${token} a value the light theme does not use`).toBe(light![1].trim());
    }
  });

  /*
   * The gradients, at the specificity the theme set them. Without this
   * selector the wash prints; without `background-image: none` it is tinted.
   */
  it("removes the page wash at the selector that applied it", () => {
    expect(printBlock).toContain(':root[data-theme="dark"] body');
    const ground = printBlock.slice(printBlock.indexOf(':root[data-theme="dark"] body'));
    expect(ground).toMatch(/background-image:\s*none/);
  });

  /* The ink stays the site's. A print-only palette is what went wrong before. */
  it("does not invent a printing palette", () => {
    expect(printBlock).not.toMatch(/color:\s*#000\s*!important/);
    expect(printBlock, "a blanket rule over every element is not a theme").not.toMatch(/\*::after\s*\{/);
  });
});
