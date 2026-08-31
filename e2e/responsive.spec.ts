import { expect, test, type Page } from "@playwright/test";

/**
 * Layout checks at the widths the family actually uses.
 *
 * These exist because a dropdown shipped anchored to its right edge: correct
 * on a desktop, and off the left of an iPhone, where the panel is nearly as
 * wide as the screen. Nothing caught it, because every check we had ran at one
 * width with every menu closed.
 *
 * So this suite does the two things that would have: it loads each page at
 * phone, tablet and desktop widths and looks for anything sticking out of the
 * viewport, and it opens the menus and looks again. An overlay is only ever
 * wrong when it is open, which is exactly when nothing was looking.
 */

const PAGES = [
  { name: "home", path: "/" },
  { name: "study", path: "/users/johnmorrisdotca" },
  { name: "game lobby", path: "/users/johnmorrisdotca/game" },
  { name: "history", path: "/users/johnmorrisdotca/history" },
  { name: "grades", path: "/users/johnmorrisdotca/grades" },
  { name: "libraries", path: "/users/johnmorrisdotca/libraries" },
  { name: "profile", path: "/users/johnmorrisdotca/profile" },
  { name: "releases", path: "/releases" },
  { name: "search", path: "/search" },
  { name: "news", path: "/news" },
  // Public, and the page a shared kanji link opens.
  { name: "shared kanji", path: "/kanji/%E4%BD%95" },
];

type Overflow = { tag: string; classes: string; left: number; right: number };

/**
 * Everything visible that sticks out sideways, ignoring what is allowed to.
 *
 * Content wider than the screen is fine when it scrolls inside its own
 * `overflow-x` container - that is the repo's rule for tables and chip rows -
 * so an element is only reported when no ancestor scrolls it. Zero-sized and
 * hidden nodes are skipped, as are the transform-based offsets an element uses
 * while animating in.
 */
async function overflowing(page: Page): Promise<Overflow[]> {
  return page.evaluate(() => {
    const viewport = document.documentElement.clientWidth;
    const found: Overflow[] = [];

    const scrollsHorizontally = (node: Element | null): boolean => {
      for (let parent = node; parent; parent = parent.parentElement) {
        const overflowX = getComputedStyle(parent).overflowX;
        if (overflowX === "auto" || overflowX === "scroll" || overflowX === "hidden") return true;
      }
      return false;
    };

    for (const element of document.body.querySelectorAll("*")) {
      const style = getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") continue;

      const box = element.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      // One pixel of slack for sub-pixel rounding at fractional device ratios.
      if (box.left >= -1 && box.right <= viewport + 1) continue;
      if (scrollsHorizontally(element.parentElement)) continue;

      found.push({
        tag: element.tagName.toLowerCase(),
        classes: String(element.className ?? "").slice(0, 90),
        left: Math.round(box.left),
        right: Math.round(box.right),
      });
    }

    return found;
  });
}

function describeOverflow(items: Overflow[], viewport: number): string {
  return items
    .map((item) => `${item.tag}.${item.classes} spans ${item.left}..${item.right} in ${viewport}px`)
    .join("\n");
}

for (const { name, path } of PAGES) {
  test(`${name} fits its viewport`, async ({ page }, testInfo) => {
    const viewport = page.viewportSize()?.width ?? 0;

    const response = await page.goto(path, { waitUntil: "domcontentloaded" });
    expect(response?.status(), `${path} should load`).toBeLessThan(400);

    // Let client-rendered lists and counts settle before measuring.
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(500);

    const items = await overflowing(page);
    expect(items, `${name} at ${testInfo.project.name}:\n${describeOverflow(items, viewport)}`).toEqual([]);

    // A page that scrolls sideways is the same fault seen from the document.
    const scrolls = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(scrolls, `${name} should not scroll sideways`).toBe(false);
  });
}

/**
 * Menus, checked while open.
 *
 * Each entry names a control and the panel it reveals. The panel is measured
 * against the viewport, which is the check that the shipped dropdown bug would
 * have failed at phone width and passed everywhere else.
 */
const MENUS = [
  { name: "study queue menu", path: "/users/johnmorrisdotca", trigger: { role: "tab" as const, name: /Reviews/ } },
  { name: "study mode menu", path: "/users/johnmorrisdotca", trigger: { role: "button" as const, name: /^Mode$/i } },
  /*
   * The account menu carries the whole navigation on a phone and almost none
   * of it on a desktop, so it is a different panel at each width and has to be
   * measured at each.
   */
  { name: "account menu", path: "/users/johnmorrisdotca", trigger: { role: "button" as const, name: /Open user menu/i } },
];

for (const menu of MENUS) {
  test(`${menu.name} opens inside the viewport`, async ({ page }, testInfo) => {
    const viewport = page.viewportSize()?.width ?? 0;

    await page.goto(menu.path, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    const control = page.getByRole(menu.trigger.role, { name: menu.trigger.name }).first();
    if ((await control.count()) === 0) {
      test.skip(true, `${menu.name} is not on the page here`);
    }

    await control.click();
    await page.waitForTimeout(400);

    const items = await overflowing(page);
    expect(
      items,
      `${menu.name} open at ${testInfo.project.name}:\n${describeOverflow(items, viewport)}`,
    ).toEqual([]);
  });
}
