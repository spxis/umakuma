import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const HERE = "src/app/users/[nickname]";
const NEXT_CONFIG = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");

/**
 * Every member page is a page.
 *
 * Six of them were not. `/users/:nickname/study`, `/library-explorer`,
 * `/jlpt-explorer`, `/read`, `/stats` and `/news` were rewrites in
 * `next.config.ts` onto one 474-line component, so the address bar said one
 * thing and the server was handed `/users/:nickname?dashboard=...`. The query
 * string had not gone away; it had stopped being visible.
 *
 * It cost more than tidiness. Six addresses sharing one file is how they drifted
 * into six different layouts with nobody editing six files, and the file loaded
 * every level snapshot on the account for all of them - so opening Read to read
 * a table of yen fetched seventeen levels of WaniKani subjects.
 *
 * This is the guard against it coming back. A rewrite is the easy way to add an
 * address, and it is the wrong one: it buys a URL and skips the page.
 */
describe("member pages", () => {
  const segments = [
    "study",
    "library-explorer",
    "jlpt-explorer",
    "read",
    "study/stats",
    "news",
    "study/history",
    "lists",
    "libraries",
    "profile",
    "wanikani",
    "xp",
    "xp/history",
    "theme",
  ];

  it.each(segments)("/%s is a route with a page of its own", (segment) => {
    expect(existsSync(join(process.cwd(), HERE, segment, "page.tsx"))).toBe(true);
  });

  /*
   * History and Stats moved under Study, and moved means moved: the repo keeps
   * no redirects, so an old address is a 404 rather than a second way in.
   */
  it.each(["history", "stats"])("leaves nothing behind at /%s", (segment) => {
    expect(existsSync(join(process.cwd(), HERE, segment, "page.tsx"))).toBe(false);
  });

  /*
   * Game names the game in the address - `/game/practice` - so its page sits
   * under an optional catch-all rather than at the segment itself. Both
   * addresses are the same page; only the hub has no game to name.
   */
  it("gives the game itself a place in the address", () => {
    expect(existsSync(join(process.cwd(), HERE, "game", "[[...kind]]", "page.tsx"))).toBe(true);
    expect(existsSync(join(process.cwd(), HERE, "game", "page.tsx"))).toBe(false);
  });

  /*
   * The whole `rewrites` key, not just the six. Any rewrite under `/users`
   * would be the same trade - an address without a page - and the repo's own
   * rule is to change the thing and update every caller rather than alias it.
   */
  it("adds no rewrites", () => {
    expect(NEXT_CONFIG).not.toContain("rewrites");
    expect(NEXT_CONFIG).not.toContain("dashboard=");
  });

  /*
   * The bare `/users/<who>` still has to answer, and it points at Study
   * because that is what the navigation means by a member's page.
   */
  it("sends the bare member address to Study", () => {
    const root = readFileSync(join(process.cwd(), HERE, "page.tsx"), "utf8");
    expect(root).toContain("redirect(");
    expect(root).toContain("/study");
  });

  /*
   * The point of the split: a page loads what it shows. Read renders check-ins
   * and News renders an article, and neither has any use for the level
   * snapshots, the item spread or the per-level arithmetic.
   */
  it.each(["read", "news"])("%s does not load the level progress", (segment) => {
    const page = readFileSync(join(process.cwd(), HERE, segment, "page.tsx"), "utf8");
    expect(page).not.toContain("loadLevelProgress");
  });

  /* And the one page that is about level progress does load it. */
  it("stats loads the level progress", () => {
    expect(readFileSync(join(process.cwd(), HERE, "study/stats/page.tsx"), "utf8")).toContain(
      "loadLevelProgress",
    );
  });

  /*
   * Only the JLPT explorer needs the JLPT table and the member's kanji index.
   * On the shared page that was decided by a `?tab=` query; here the route
   * decides it, which is the difference between the two designs in one line.
   */
  it("asks for the JLPT data on the JLPT explorer alone", () => {
    for (const segment of ["study", "library-explorer", "jlpt-explorer"]) {
      const page = readFileSync(join(process.cwd(), HERE, segment, "page.tsx"), "utf8");
      expect(page).toContain("loadExplorerPage");
    }
    const loader = readFileSync(join(process.cwd(), HERE, "lib/explorerPage.ts"), "utf8");
    expect(loader).toContain('withJlpt: tab === "jlpt"');
  });
});
