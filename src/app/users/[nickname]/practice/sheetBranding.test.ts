import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { SITE_URL } from "@/lib/siteOrigin";

import { PRACTICE_SHEET_COPY } from "./practiceCopy";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const page = () => read("src/app/users/[nickname]/practice/[[...target]]/page.tsx");
const banner = () => read("src/app/shared/UmaKumaPageBanner.tsx");

/*
 * A worksheet says it came from UmaKuma.
 *
 * The sheet carried no brand: the site's navigation on screen and nothing on
 * paper, where a sheet is photocopied, handed to a child and pinned to a
 * fridge. Every other page wears the banner. Here it is the compact one on
 * screen and, since a banner does not belong on a worksheet, one grey line on
 * paper with the name and the address - so whoever picks the page up knows
 * where it came from and where to get another.
 */
describe("the sheet's brand", () => {
  it("wears the site's banner on screen, in its compact form", () => {
    expect(page()).toContain('<UmaKumaPageBanner variant="compact"');
    /* The compact banner is the mark and the name alone, one line tall. */
    const compact = banner().slice(banner().indexOf("compact: {"));
    expect(compact.slice(0, compact.indexOf("},"))).not.toContain("leftDesktopImage");
  });

  it("keeps the banner off the paper", () => {
    const line = page().split("\n").find((l) => l.includes('variant="compact"')) ?? "";
    expect(line).toContain("print:hidden");
  });

  it("names itself on paper, with the address to find it at", () => {
    const source = page();
    expect(source).toContain("PRACTICE_SHEET_COPY.printedBy");
    expect(source).toContain("SITE_URL.host");
    expect(PRACTICE_SHEET_COPY.printedBy).toBe("UmaKuma");
    expect(SITE_URL.host).toBe("www.umakuma.com");
  });

  /* The line sits in the print-only block, the one place the paper header shows anything. */
  it("puts the printed name where the name and date lines are", () => {
    const source = page();
    const printBlock = source.indexOf('print:flex">');
    const printedBy = source.indexOf("PRACTICE_SHEET_COPY.printedBy");
    const nameLine = source.indexOf("PRACTICE_SHEET_COPY.printName");
    expect(printBlock).toBeGreaterThan(-1);
    expect(printedBy).toBeGreaterThan(printBlock);
    expect(printedBy).toBeLessThan(nameLine);
  });
});
