import { describe, expect, it } from "vitest";

import { buildMainLinks } from "./appTopMenuLinks";

describe("buildMainLinks", () => {
  /*
   * Nothing at all, on purpose. The one link a signed-out visitor was given
   * was the leaderboard, so a stranger who followed a link to a kanji was
   * shown a scoreboard of people they do not know and nothing else.
   */
  it("offers a signed-out visitor no links at all", () => {
    expect(buildMainLinks(null)).toEqual([]);
  });

  it("never points a link at /join", () => {
    for (const links of [buildMainLinks(null), buildMainLinks("john")]) {
      for (const link of links) {
        expect(link.href, link.label).not.toContain("/join");
      }
    }
  });

  it("gives a resolved member the full navigation", () => {
    const links = buildMainLinks("johnmorrisdotca");
    const labels = links.map((link) => link.label);

    expect(labels).not.toContain("Leaderboard");
    expect(labels).toContain("Game");
    expect(labels).toContain("History");
    expect(labels).toContain("Libraries");
    /* A destination of its own, not a page under Explore. */
    expect(labels).toContain("Lists");
    expect(labels).not.toContain("Admin");
    expect(links.find((link) => link.label === "Game")?.href).toBe("/users/johnmorrisdotca/game");
  });

  /* Admin is a workspace, not a place a member studies; it lives in the menu. */
  it("never puts Admin in the header row", () => {
    expect(buildMainLinks("johnmorrisdotca").map((link) => link.label)).not.toContain("Admin");
    expect(buildMainLinks(null)).toEqual([]);
  });

  it("escapes usernames in hrefs", () => {
    const links = buildMainLinks("a b");
    expect(links.find((link) => link.label === "Game")?.href).toBe("/users/a%20b/game");
  });
});
