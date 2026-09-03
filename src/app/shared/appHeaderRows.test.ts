import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

/*
 * The header's two rows hold one line, whatever the width.
 *
 * Wrapping is the failure that keeps coming back, because it looks harmless in
 * the one window the person changing it has open: between about 1000 and 1280
 * pixels the top row broke after LISTS, and the section row stacked its pages
 * into a column. A header that changes height as the window moves takes the
 * page below it with it, and the reader loses their place mid-sentence.
 *
 * Written against the source because the rule is a class, and the class is the
 * thing that gets deleted by accident. Both rows scroll instead - the phone row
 * has always done exactly this, and it is the same three classes.
 */
describe("the header rows", () => {
  const rows: Array<[string, string]> = [
    ["the top row", "src/app/shared/AppTopMenuRow.tsx"],
    ["the section row", "src/app/shared/AppSubNavRow.tsx"],
  ];

  it.each(rows)("never lets %s wrap", (_name, path) => {
    expect(read(path)).not.toContain("flex-wrap");
  });

  it.each(rows)("scrolls %s instead, with the scrollbar hidden", (_name, path) => {
    const source = read(path);
    expect(source).toContain("overflow-x-auto");
    expect(source).toContain("whitespace-nowrap");
    expect(source).toContain("admin-tab-scroll");
  });

  /* A link that can shrink is a link that wraps its own text instead. */
  it.each(rows)("keeps every link in %s at its own width", (_name, path) => {
    expect(read(path)).toContain("shrink-0");
  });

  /*
   * The codename is decoration; the pages of a section are not. It took enough
   * of the second row between 1024 and 1280 to push STROKES off the end.
   */
  it("holds the codename back until the section row is safe", () => {
    expect(read("src/app/shared/ReleaseMotto.tsx")).toContain("xl:block");
  });
});
