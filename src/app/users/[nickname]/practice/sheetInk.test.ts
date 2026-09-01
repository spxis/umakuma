import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const HERE = join(process.cwd(), "src/app/users/[nickname]/practice");
const read = (file: string) => readFileSync(join(HERE, file), "utf8");

/*
 * The sheet is drawn twice: once in the site's colours, once in ink.
 *
 * It used to be drawn only in ink - white background, neutral greys, black
 * text - because it is made to be printed, which left the one page in the app
 * that looked like a photocopy of the others. Now the page is themed and the
 * print rules take the colour back out, and that only holds while every
 * colour on a printed element states its printed value too.
 */
describe("the practice sheet's two sets of colours", () => {
  /** The theme inks. A screen colour, in other words - not a printed one. */
  const THEME_INK = /\b(?:text|border|bg)-(?:accent|foreground|line|surface)\b/;

  /*
   * Every element in the tracing sheet reaches paper - it is the only part of
   * the page that is not `print:hidden` - so a theme colour here without a
   * `print:` counterpart is a colour that would print as itself.
   */
  it("gives every colour in the tracing sheet a printed counterpart", () => {
    const source = read("TracingSheet.tsx");
    /* Each quoted class string on its own; a `print:` in a neighbour is not cover. */
    const strings = source.match(/"[^"\n]*"/g) ?? [];
    const coloured = strings.filter((value) => THEME_INK.test(value));

    expect(coloured.length).toBeGreaterThan(0);
    for (const value of coloured) {
      expect(value, `${value} sets a theme colour with nothing said about paper`).toContain("print:");
    }
  });

  /*
   * The backstop under those classes. Without the marked region a panel added
   * later lays its filled background across the page, and without the rule the
   * marker is decoration.
   */
  it("marks the region the print rules strip back", () => {
    expect(read("[[...target]]/page.tsx")).toContain('data-print="mono"');

    const globals = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    const printBlock = globals.slice(globals.indexOf("@media print"));
    expect(printBlock).toContain('[data-print="mono"]');
  });

  /*
   * The controls never print, so they carry no print classes at all - which is
   * exactly why they had no business being grey. If these ever start printing,
   * the rule above stops covering them.
   */
  it("keeps the controls off paper entirely", () => {
    expect(read("SheetOptionsRow.tsx")).toContain("print:hidden");

    /*
     * The print button carries no rule of its own - it is hidden by the group
     * it sits in, which is the only reason its own colours need no printed
     * counterpart. Checking the group rather than the file is the difference
     * between knowing that and assuming it.
     */
    const page = read("[[...target]]/page.tsx");
    const before = page.slice(Math.max(0, page.indexOf("<PrintButton") - 400), page.indexOf("<PrintButton"));
    expect(before, "the print button is not inside a print:hidden group").toContain("print:hidden");
  });
});
