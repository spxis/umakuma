import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { WANIKANI_BOARD_ANCHOR, WANIKANI_BOARD_HREF } from "./leaderboardAddress";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

/*
 * A broken anchor is the quiet kind of broken.
 *
 * `/#wanikani-board` with no `#wanikani-board` on the page is not an error
 * anywhere - no 404, no console line, no failing render. The browser loads the
 * home page, finds nothing to scroll to and stops at the top, which is exactly
 * what the link looked like it did before it was a link at all. So the two
 * ends are checked against each other here rather than left to somebody
 * noticing.
 *
 * Read out of the source because the section is drawn inside a page that reads
 * the database, and standing that up in a unit test would be a great deal of
 * apparatus to assert one attribute.
 */
describe("the WaniKani board's address", () => {
  it("points at an anchor the home page actually carries", () => {
    expect(read("src/app/page.tsx")).toContain(`id={WANIKANI_BOARD_ANCHOR}`);
  });

  it("is the home page, since that is where the board is drawn", () => {
    expect(WANIKANI_BOARD_HREF).toBe(`/#${WANIKANI_BOARD_ANCHOR}`);
  });

  /*
   * The anchor sits on the section holding the table, not on the hero above
   * it. Landing a member at the top of the home page is the failure this
   * whole module exists to avoid, and the marker for "this is the table" is
   * the component that draws it.
   */
  it("marks the section that holds the board, not the top of the page", () => {
    const page = read("src/app/page.tsx");
    const anchored = page.indexOf("id={WANIKANI_BOARD_ANCHOR}");
    const table = page.indexOf("<LeaderboardTable");

    expect(anchored).toBeGreaterThan(-1);
    expect(table).toBeGreaterThan(anchored);
  });
});
