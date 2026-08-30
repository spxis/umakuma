import { describe, expect, it } from "vitest";

import { NAV_SECTIONS, navChildHref, sectionForPath, sectionHasSubNav } from "./navSections";

const USER = "johnmorrisdotca";

describe("the grouped header", () => {
  it("collapses the old flat list to a handful of groups", () => {
    expect(NAV_SECTIONS.length).toBeLessThanOrEqual(8);
  });

  it("keeps every page reachable, none dropped in the regroup", () => {
    const paths = NAV_SECTIONS.flatMap((section) => section.children.map((child) => child.path));
    for (const expected of [
      "/",
      "study",
      "game",
      "library-explorer",
      "jlpt-explorer",
      "grades",
      "history",
      "stats",
      "read",
      "news",
      "libraries",
      "grades/practice",
    ]) {
      expect(paths).toContain(expected);
    }
  });

  it("never lists the same page under two groups", () => {
    const paths = NAV_SECTIONS.flatMap((section) => section.children.map((child) => child.path));
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("gives every group at least one page to open", () => {
    for (const section of NAV_SECTIONS) {
      expect(section.children.length).toBeGreaterThan(0);
    }
  });
});

describe("navChildHref", () => {
  it("scopes a page to the viewer", () => {
    expect(navChildHref({ label: "History", path: "history" }, USER)).toBe(`/users/${USER}/history`);
  });

  it("leaves an absolute path alone", () => {
    expect(navChildHref({ label: "Leaderboard", path: "/" }, USER)).toBe("/");
  });

  it("falls back to the leaderboard with no user to scope to", () => {
    expect(navChildHref({ label: "History", path: "history" }, null)).toBe("/");
  });
});

describe("sectionForPath", () => {
  it("puts the three explorers in one group", () => {
    const ids = ["library-explorer", "jlpt-explorer", "grades"].map(
      (segment) => sectionForPath(`/users/${USER}/${segment}`, USER)?.id,
    );
    expect(ids).toEqual(["explore", "explore", "explore"]);
  });

  it("puts history and stats under progress, not settings", () => {
    expect(sectionForPath(`/users/${USER}/history`, USER)?.id).toBe("progress");
    expect(sectionForPath(`/users/${USER}/stats`, USER)?.id).toBe("progress");
  });

  /*
   * The WaniKani explorer moved from `wk-explorer` to `library-explorer` and
   * links in the wild still use the old path.
   */
  it("still resolves the explorer's old path", () => {
    expect(sectionForPath(`/users/${USER}/wk-explorer`, USER)?.id).toBe("explore");
  });

  /*
   * A nested child still resolves: the pathname only surfaces its first
   * segment, so matching has to compare on that rather than the whole path.
   */
  it("puts a nested page in its group", () => {
    expect(sectionForPath(`/users/${USER}/grades/practice`, USER)?.id).toBe("explore");
  });

  it("finds the leaderboard at the root", () => {
    expect(sectionForPath("/", USER)?.id).toBe("leaderboard");
  });

  it("returns nothing for a page outside the grouped nav", () => {
    expect(sectionForPath("/admin", USER)).toBeNull();
    expect(sectionForPath(null, USER)).toBeNull();
  });
});

describe("sectionHasSubNav", () => {
  /*
   * A second row repeating the header teaches nothing, so single-page groups
   * do not draw one.
   */
  it("is quiet for a group holding one page", () => {
    expect(sectionHasSubNav(sectionForPath("/", USER))).toBe(false);
    expect(sectionHasSubNav(sectionForPath(`/users/${USER}/study`, USER))).toBe(false);
  });

  it("shows for a group holding several", () => {
    expect(sectionHasSubNav(sectionForPath(`/users/${USER}/grades`, USER))).toBe(true);
    expect(sectionHasSubNav(sectionForPath(`/users/${USER}/news`, USER))).toBe(true);
  });

  it("is quiet when there is no section at all", () => {
    expect(sectionHasSubNav(null)).toBe(false);
  });
});
