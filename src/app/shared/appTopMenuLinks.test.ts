import { describe, expect, it } from "vitest";

import { buildMainLinks } from "./appTopMenuLinks";

describe("buildMainLinks", () => {
  it("gives an anonymous viewer only the leaderboard", () => {
    const links = buildMainLinks(null, false);
    expect(links.map((link) => link.label)).toEqual(["Leaderboard"]);
  });

  it("never points a link at /join", () => {
    for (const links of [buildMainLinks(null, false), buildMainLinks(null, true), buildMainLinks("john", true)]) {
      for (const link of links) {
        expect(link.href, link.label).not.toContain("/join");
      }
    }
  });

  it("gives a resolved member the full navigation", () => {
    const links = buildMainLinks("johnmorrisdotca", false);
    const labels = links.map((link) => link.label);

    expect(labels[0]).toBe("Leaderboard");
    expect(labels).toContain("Game");
    expect(labels).toContain("History");
    expect(labels).toContain("Libraries");
    expect(labels).not.toContain("Admin");
    expect(links.find((link) => link.label === "Game")?.href).toBe("/users/johnmorrisdotca/game");
  });

  it("shows Admin to an admin even with no resolved account", () => {
    const links = buildMainLinks(null, true);
    expect(links.map((link) => link.label)).toEqual(["Leaderboard", "Admin"]);
  });

  it("escapes usernames in hrefs", () => {
    const links = buildMainLinks("a b", false);
    expect(links.find((link) => link.label === "Game")?.href).toBe("/users/a%20b/game");
  });
});
