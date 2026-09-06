import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

/**
 * A rank is a place, so its name is a door.
 *
 * Every rank page is reachable only by being linked to, and a surface that
 * prints "Rookie" without linking it makes the reader hunt the chart for a
 * page that was one word away. John asked for this by name after finding the
 * chart was the only way in.
 *
 * Asserted over the sources rather than by rendering, because the point is
 * that no *new* surface prints a rank name flatly - a render test only covers
 * the ones somebody remembered to write.
 */
/*
 * Surfaces print a rank through `RankName`, which owns both the arrangement
 * and the link. Asserting on the component rather than on a path is the
 * stronger test: a surface that hand-rolled its own `/xp/rank/` link would
 * pass a path check while quietly reintroducing the inconsistency the
 * component exists to prevent.
 */
const SURFACES = [
  "src/app/xp/XpBoardRows.tsx",
  "src/app/xp/rank/[level]/page.tsx",
  "src/app/xp/promotions/page.tsx",
  "src/app/users/[nickname]/settings/XpRankPanel.tsx",
  "src/app/users/[nickname]/settings/ProfileXpHeadline.tsx",
];

describe("every rank name is written the one way, and is a door", () => {
  it.each(SURFACES)("%s prints its rank through RankName", (path) => {
    expect(read(path)).toContain("RankName");
  });

  it.each(SURFACES)("%s hand-rolls no rank link of its own", (path) => {
    expect(read(path)).not.toContain("/xp/rank/");
  });

  /* RankName is the one place that links, and the one place that decides
     whether it reads "L1 Rookie" or "Rookie (L1)". */
  it("keeps the link and the arrangement in one component", () => {
    const component = read("src/app/shared/xp/RankName.tsx");

    expect(component).toContain("/xp/rank/");
    expect(component).toContain("badge-first");
    expect(component).toContain("name-first");
    expect(component).toContain("xpRankBadge");
  });

  /*
   * The ladder chart is the deliberate exception: it is a table with a column
   * of its own for the badge, so it cannot put both in one cell without losing
   * the alignment that makes a hundred rows scannable. It still links.
   */
  it("links the chart's rank names even though it lays them out itself", () => {
    expect(read("src/app/xp/XpLadderChart.tsx")).toContain("/xp/rank/");
  });

  /*
   * The count beside a rank must not print a zero. Ninety-seven zeroes down a
   * hundred-row chart is noise, and a blank says "nobody" more quietly - which
   * is what John asked for when the question came up.
   */
  it("prints a rank's population only where somebody is standing there", () => {
    expect(read("src/app/xp/XpLadderChart.tsx")).toContain("standing > 0");
  });

  /* Counted from the placed board rather than queried again, and from the
     entries rather than the materialised `Account.xpLevel`. */
  it("counts the ranks from the board the page already loaded", () => {
    const page = read("src/app/xp/page.tsx");

    expect(page).toContain("standingAt");
    expect(page).toContain("entry.standing.level");
    expect(page).not.toMatch(/account\.xpLevel|xpLevel:\s*true/);
  });
});
