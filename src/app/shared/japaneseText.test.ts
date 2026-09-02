import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { JP_TEXT_CLASS, NO_TRANSLATE_CLASS, noTranslate, noTranslateClass } from "./japaneseText";

const SRC = join(process.cwd(), "src");
const RAW_FONT_LITERAL = "[font-family:var(--font-jp-current)]";

/** Every source file under src/, so the sweep cannot miss a new directory. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry) ? [path] : [];
  });
}

describe("the Japanese text marker", () => {
  it("carries both spellings, since engines honour different ones", () => {
    expect(JP_TEXT_CLASS).toContain(NO_TRANSLATE_CLASS);
    expect(JP_TEXT_CLASS).toContain(RAW_FONT_LITERAL);
    expect(noTranslate.translate).toBe("no");
    expect(noTranslate.className).toBe(NO_TRANSLATE_CLASS);
  });

  it("keeps an element's own classes", () => {
    expect(noTranslateClass("text-xl font-black")).toBe(`${NO_TRANSLATE_CLASS} text-xl font-black`);
    expect(noTranslateClass()).toBe(NO_TRANSLATE_CLASS);
  });

  /*
   * The whole point of the constant. Anything rendered in the Japanese font is
   * Japanese, so styling it and protecting it were never separate decisions -
   * and a surface that reaches for the font literal directly is a surface that
   * Chrome will happily rewrite into English words.
   *
   * This file and the globals stylesheet are where the literal belongs; the
   * stylesheet is not scanned because it defines the variable rather than
   * using it as a class.
   */
  it("is the only place the Japanese font class is written", () => {
    const offenders = sourceFiles(SRC)
      .filter((path) => !path.endsWith(join("shared", "japaneseText.ts")))
      .filter((path) => !path.endsWith(join("shared", "japaneseText.test.ts")))
      .filter((path) => readFileSync(path, "utf8").includes(RAW_FONT_LITERAL))
      .map((path) => path.slice(SRC.length + 1));

    expect(
      offenders,
      `use JP_TEXT_CLASS from @/app/shared/japaneseText instead of the raw font class:\n  ${offenders.join("\n  ")}`,
    ).toEqual([]);
  });

  /*
   * The gap this closes was found in a screenshot rather than by a test, which
   * is the wrong way round. The stroke-order modal draws the character twice
   * for its Gothic and Mincho previews, styled with the glyph font but no
   * marker, so both previews said "circle" where 円 belonged. Two more like it
   * were sitting in the shared explorer card's rows layout and the game's
   * match prompt.
   *
   * They share a shape: an element that reaches for a Japanese typeface and
   * does not refuse translation. Anything setting one of these fonts is
   * displaying Japanese, so the marker has to be within reach of it.
   */
  it("never sets a Japanese typeface without refusing translation", () => {
    /*
     * `glyphTextSizeClass` counts as a marker because it returns one - the
     * test above this pins that - so a glyph sized through it is already
     * covered and does not need a second one.
     */
    const MARKERS = [
      NO_TRANSLATE_CLASS,
      'translate="no"',
      "noTranslateClass",
      "JP_TEXT_CLASS",
      "glyphTextSizeClass",
    ];

    /** Puts the font on an element that shows text: the marker goes here. */
    const RENDERS = ["style={{ fontFamily }}", "style={{ fontFamily:"];
    /*
     * Hands the font somewhere else - a style helper's return, or a prop
     * passed to a component that does the rendering. The marker belongs
     * wherever it lands, so the file only has to protect it somewhere.
     */
    const CARRIES = [
      "var(--font-jp-sans)",
      "var(--font-jp-serif)",
      "var(--font-jp-textbook)",
      "var(--font-jp-brush)",
      "glyphFontFamily(",
    ];

    const offenders: string[] = [];
    for (const path of sourceFiles(SRC)) {
      if (path.includes("japaneseText") || path.includes("glyphFontPreference")) continue;
      const source = readFileSync(path, "utf8");
      const lines = source.split("\n");
      const fileProtected = MARKERS.some((marker) => source.includes(marker));

      lines.forEach((line, index) => {
        const renders = RENDERS.some((signal) => line.includes(signal));
        const carries = CARRIES.some((signal) => line.includes(signal));
        if (!renders && !carries) return;

        if (renders) {
          // One element's attributes, which may run over several lines.
          const near = lines.slice(Math.max(0, index - 6), index + 7).join("\n");
          if (MARKERS.some((marker) => near.includes(marker))) return;
        } else if (fileProtected) {
          return;
        }

        offenders.push(`${path.slice(SRC.length + 1)}:${index + 1}  ${line.trim().slice(0, 70)}`);
      });
    }

    expect(
      offenders,
      `these render in a Japanese face with nothing stopping a translator:\n  ${offenders.join("\n  ")}`,
    ).toEqual([]);
  });
});
