import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

/*
 * Who is allowed to walk the site.
 *
 * There was no robots.txt at all, so crawlers were walking every member page -
 * each one a serverless invocation rendering somebody's private study data to a
 * bot that cannot see it. The writing practice sheets made it acute: source,
 * level, sheet size, mode and page all live in the URL, which is what makes a
 * sheet shareable and also means one school grade is thousands of addresses. In
 * twelve hours that one route took 3,200 invocations, against a site with eight
 * accounts on it.
 *
 * The rules are checked against the route tree rather than written down twice,
 * so a member page added later is either covered or fails here.
 */
const ROBOTS = readFileSync(join(process.cwd(), "public/robots.txt"), "utf8");

function disallowedPaths(): string[] {
  return ROBOTS.split("\n")
    .map((line) => line.trim())
    .filter((line) => line.toLowerCase().startsWith("disallow:"))
    .map((line) => line.slice("disallow:".length).trim())
    .filter(Boolean);
}

/** Every route the app serves a page for, as a URL path. */
function pageRoutes(): string[] {
  const root = join(process.cwd(), "src/app");
  const found: string[] = [];

  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else if (name === "page.tsx") {
        const url = `/${relative(root, dir)}`.replace(/\\/g, "/");
        found.push(url === "/." ? "/" : url);
      }
    }
  };

  walk(root);
  return found;
}

const covered = (path: string) => disallowedPaths().some((rule) => path.startsWith(rule));

describe("the crawl policy", () => {
  it("closes every member page", () => {
    const memberPages = pageRoutes().filter((route) => route.startsWith("/users/"));

    expect(memberPages.length).toBeGreaterThan(0);
    for (const route of memberPages) {
      expect(covered(route), `${route} is open to crawlers`).toBe(true);
    }
  });

  it("closes admin and the API", () => {
    const adminPages = pageRoutes().filter((route) => route.startsWith("/admin"));

    expect(adminPages.length).toBeGreaterThan(0);
    for (const route of adminPages) {
      expect(covered(route), `${route} is open to crawlers`).toBe(true);
    }
    expect(covered("/api/leaderboard")).toBe(true);
  });

  /*
   * A blanket `Disallow: /` would have been the easy answer and the wrong one.
   * The home page, the release notes and the kanji pages are the site's public
   * face, and a family site nobody can find is not more private for it.
   */
  it("leaves the public front open", () => {
    for (const route of ["/", "/releases", "/news", "/kanji/日"]) {
      expect(covered(route), `${route} is closed to crawlers`).toBe(false);
    }
  });

  it("applies to every crawler, not a named few", () => {
    const agents = ROBOTS.split("\n")
      .map((line) => line.trim().toLowerCase())
      .filter((line) => line.startsWith("user-agent:"));

    // One group, for everyone. Naming crawlers means missing the next one.
    expect(agents).toEqual(["user-agent: *"]);
  });
});
