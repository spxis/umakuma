import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { XP_SECTION_LINKS } from "../XpSectionNav";

const ROOT = join(process.cwd(), "src/app/xp");

/** Every `page.tsx` under `/xp`, however deep. */
function pagesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return pagesUnder(path);
    return entry === "page.tsx" ? [path] : [];
  });
}

/**
 * No page in this section is reachable from nowhere.
 *
 * `/xp/promotions` was linked from **nothing on the site** and `/xp/weekly`
 * only from itself: both were built, tested, gated and invisible. Adding the
 * missing links by hand fixes today and not tomorrow, so the guard is
 * structural - a page that joins the section renders the row, and this fails
 * if one does not.
 *
 * Asserted over the sources rather than by rendering, because the point is to
 * catch the page somebody forgets, and a render test only covers the ones
 * somebody remembered to write.
 */
describe("the XP section nav", () => {
  const pages = pagesUnder(ROOT);

  it("finds every page in the section", () => {
    expect(pages.length).toBeGreaterThanOrEqual(5);
  });

  it.each(pagesUnder(ROOT))("%s renders the section nav", (path) => {
    expect(readFileSync(path, "utf8")).toContain("<XpSectionNav");
  });

  /* Every destination in the row is a real page, or the row promises a 404. */
  it.each(XP_SECTION_LINKS.map((link) => link.href))("%s is a page that exists", (href) => {
    const segments = href.replace(/^\/xp\/?/, "");
    const dir = segments.length === 0 ? ROOT : join(ROOT, segments);
    expect(statSync(join(dir, "page.tsx")).isFile()).toBe(true);
  });

  /*
   * One line at every width, scrolling rather than wrapping - the same rule
   * the two header rows above it follow, and for the same reason: a nav that
   * grows a second line as the window narrows moves the page under the reader.
   */
  it("never wraps", () => {
    const nav = readFileSync(join(ROOT, "XpSectionNav.tsx"), "utf8");

    expect(nav).toContain("flex-nowrap");
    expect(nav).toContain("overflow-x-auto");
    expect(nav).not.toContain("flex-wrap");
  });
});
