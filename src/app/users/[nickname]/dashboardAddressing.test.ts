import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const TABS = readFileSync(
  join(process.cwd(), "src/app/users/[nickname]/UserDashboardTabs.tsx"),
  "utf8",
);
const NEXT_CONFIG = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");

/*
 * Every dashboard tab has an address, and the address has to be obeyed.
 *
 * The explorers each live at their own path - `/library-explorer`,
 * `/jlpt-explorer` - but all of them rewrite to the one user page with a
 * `dashboard` parameter. Moving between them therefore re-renders the tab
 * component rather than remounting it, and `activeTab` was seeded from the
 * prop with `useState`, which reads its argument once and ignores it
 * afterwards. Clicking WaniKani in the header changed the URL and left the
 * JLPT explorer on screen.
 */
describe("addressing a dashboard tab", () => {
  /*
   * The rewrite targets and the paths the component pushes are two halves of
   * the same map, written in two files. If they drift, a tab either cannot be
   * linked to or pushes an address that resolves to something else.
   */
  it("rewrites every path the tabs push to", () => {
    const segments = ["study", "library-explorer", "jlpt-explorer"];
    for (const segment of segments) {
      expect(NEXT_CONFIG, `${segment} has no rewrite`).toContain(`/users/:nickname/${segment}`);
    }
    // And the component pushes exactly those, for the tabs that rename.
    expect(TABS).toContain('tab === "learn" ? "study"');
    expect(TABS).toContain('tab === "wk" ? "library-explorer"');
    expect(TABS).toContain('tab === "jlpt" ? "jlpt-explorer"');
  });

  /*
   * The fix itself: the tab follows the prop when the prop changes. Adjusted
   * during render rather than in an effect, which is both what React asks for
   * and what avoids painting the old tab before correcting it.
   */
  it("follows the address rather than only its first value", () => {
    expect(TABS).toContain("addressedTab");
    const at = TABS.indexOf("if (initialDashboardTab !== addressedTab)");
    expect(at, "the tab no longer tracks the address it was given").toBeGreaterThan(-1);

    const block = TABS.slice(at, at + 320);
    expect(block).toContain("setActiveTab(initialDashboardTab)");
    /*
     * Except on the bare user page, whose address names no tab - there the
     * member's last open tab is restored instead, and following the prop would
     * overwrite it with "learn" on every visit.
     */
    expect(block).toContain('initialDashboardTab !== "learn"');
  });
});
