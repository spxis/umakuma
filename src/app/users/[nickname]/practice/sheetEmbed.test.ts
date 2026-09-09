import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { SHEET_EMBED_PARAM, sheetEmbedHref } from "./sheetLink";

/*
 * Pressing Worksheet used to navigate, so asking to print a list took the
 * reader off the list and changed the header's section from Lists to Learn.
 * The sheet is framed on the page instead, and these are the three joints
 * that makes: the flag, the page that answers it, and the one rule that
 * hides the site's own navigation inside the frame.
 */
const SRC = path.join(process.cwd(), "src/app");
const PRACTICE = path.join(SRC, "users/[nickname]/practice");

describe("the sheet, framed on the page that asked for it", () => {
  it("adds the flag to an address that has a query and to one that has not", () => {
    expect(sheetEmbedHref("/users/John/practice/list/week-1")).toBe(
      `/users/John/practice/list/week-1?${SHEET_EMBED_PARAM}=1`,
    );
    expect(sheetEmbedHref("/users/John/practice?size=large")).toBe(
      `/users/John/practice?size=large&${SHEET_EMBED_PARAM}=1`,
    );
  });

  it("is read by the sheet's options and marked on the sheet's page", () => {
    const options = readFileSync(path.join(PRACTICE, "sheetOptions.ts"), "utf8");
    const page = readFileSync(path.join(PRACTICE, "[[...target]]/page.tsx"), "utf8");

    expect(options).toMatch(/embed:\s*firstValue\(query\[SHEET_EMBED_PARAM\]\)/);
    expect(page).toMatch(/data-sheet-embed=\{embed \? "1" : undefined\}/);
  });

  /*
   * The rule the frame leans on. `print:hidden` already marks every part of
   * that page which is chrome rather than sheet, and a frame wants exactly
   * what paper wants, so the frame reuses the answer instead of marking
   * everything a second time. If the selector goes, the frame silently grows
   * a second copy of the site's navigation inside it.
   */
  it("hides the site's own chrome inside the frame", () => {
    const css = readFileSync(path.join(SRC, "print.css"), "utf8");

    expect(css).toMatch(/\[data-sheet-embed="1"\] \.print\\:hidden/);
  });

  /*
   * Print belongs to the sheet, and the frame prints the sheet's own document
   * rather than the page around it. If this became `window.print()` the
   * reader would get the list page with a modal over it.
   */
  it("prints the frame's document, not the page holding it", () => {
    const modal = readFileSync(path.join(SRC, "shared/WorksheetModal.tsx"), "utf8");

    expect(modal).toMatch(/contentWindow/);
    expect(modal).toMatch(/view\?\.print\(\)/);
    expect(modal).not.toMatch(/[^.]window\.print\(\)/);
  });
});
