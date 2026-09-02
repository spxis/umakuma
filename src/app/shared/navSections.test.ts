import { describe, expect, it } from "vitest";

import { NAV_SECTIONS, navChildHref, sectionForPath, sectionHasSubNav, visibleNavSections } from "./navSections";

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
      "practice",
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
  /* Every list lives under Lists, including the auto lists a visitor sees. */
  it("sends a visitor with no page of their own to the auto lists", () => {
    const lists = NAV_SECTIONS.find((section) => section.id === "lists")!;
    expect(navChildHref(lists.children[0]!, null)).toBe("/lists");
    expect(navChildHref(lists.children[0]!, USER)).toBe(`/users/${USER}/lists`);
    expect(sectionForPath("/lists", null)?.id).toBe("lists");
    expect(sectionForPath("/lists", USER)?.id).toBe("lists");
  });

  /* The maps have no user segment - one map serves everyone - and are a Learn page. */
  it("puts the public maps in the Learn group", () => {
    expect(sectionForPath("/maps", USER)?.id).toBe("explore");
    expect(sectionForPath("/maps", null)?.id).toBe("explore");
  });

  it("still resolves the explorer's old path", () => {
    expect(sectionForPath(`/users/${USER}/wk-explorer`, USER)?.id).toBe("explore");
  });

  /*
   * A nested child still resolves: the pathname only surfaces its first
   * segment, so matching has to compare on that rather than the whole path.
   */
  it("puts a nested page in its group", () => {
    expect(sectionForPath(`/users/${USER}/practice`, USER)?.id).toBe("explore");
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

/*
 * A member without WaniKani used to be offered the Library Explorer and Stats
 * by their own header, and both were empty when they arrived: sixty levels of
 * nothing, and a wall of zeros. The header answers for the account it belongs
 * to now.
 */
describe("visibleNavSections", () => {
  const CONNECTED = { hasWanikani: true };
  const UNCONNECTED = { hasWanikani: false };

  function paths(sections: ReturnType<typeof visibleNavSections>): string[] {
    return sections.flatMap((section) => section.children.map((child) => child.path));
  }

  it("changes nothing for a connected member", () => {
    expect(visibleNavSections(NAV_SECTIONS, CONNECTED)).toEqual(NAV_SECTIONS);
  });

  it("drops the WaniKani-only pages for a member with no connection", () => {
    const visible = paths(visibleNavSections(NAV_SECTIONS, UNCONNECTED));
    expect(visible).not.toContain("library-explorer");
    expect(visible).not.toContain("stats");
  });

  it("keeps everything the app can answer for itself", () => {
    const visible = paths(visibleNavSections(NAV_SECTIONS, UNCONNECTED));
    for (const open of ["study", "game", "jlpt-explorer", "grades", "practice", "/maps", "lists", "history", "read", "news", "libraries", "wanikani"]) {
      expect(visible, open).toContain(open);
    }
  });

  it("keeps the groups that still hold a page, and their order", () => {
    const groups = visibleNavSections(NAV_SECTIONS, UNCONNECTED).map((section) => section.id);
    expect(groups).toEqual(NAV_SECTIONS.map((section) => section.id));
  });

  /*
   * Resolution is deliberately not gated: a member who follows an old link to
   * a gated page still gets a header that knows where they are.
   */
  it("still resolves a gated address to its group", () => {
    expect(sectionForPath(`/users/${USER}/library-explorer`, USER)?.id).toBe("explore");
    expect(sectionForPath(`/users/${USER}/stats`, USER)?.id).toBe("progress");
  });
});

/*
 * Lists lived under Explore, which is where you go to find things; a list is
 * something you made and come back to, and it was two clicks from everywhere.
 */
describe("lists", () => {
  it("is a section of its own, not a page under Explore", () => {
    expect(sectionForPath(`/users/${USER}/lists`, USER)?.id).toBe("lists");
    const explore = NAV_SECTIONS.find((section) => section.id === "explore");
    expect(explore?.children.map((child) => child.path)).not.toContain("lists");
  });
});
