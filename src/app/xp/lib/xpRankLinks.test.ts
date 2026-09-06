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

  /* RankName is the one place that links. The arrangement it renders is not
     its own: a page heading and a browser tab need the same decision as a
     string, so it lives in `xpRanks.ts` and both read it from there. */
  it("keeps the link in one component and the arrangement in one constant", () => {
    const component = read("src/app/shared/xp/RankName.tsx");

    expect(component).toContain("/xp/rank/");
    expect(component).toContain("XP_RANK_NAME_ORDER");
    expect(component).toContain("xpRankBadge");
    /* Not a second copy of the decision, which is what it was before the rank
       page's own heading needed the same answer in text. */
    expect(component).not.toMatch(/const ORDER/);

    const ranks = read("src/lib/xp/xpRanks.ts");
    expect(ranks).toContain("badge-first");
    expect(ranks).toContain("name-first");
  });

  /*
   * The rank page's heading was the one surface that printed a rank without
   * saying which rank it was - "Rookie", over nine rows that each read "L1
   * Rookie". John, on /xp/rank/1: "doesn't tell you what NUmber the Rank is."
   */
  it("names the rank number in the heading and the tab, through the shared text", () => {
    const page = read("src/app/xp/rank/[level]/page.tsx");

    expect(page).toContain("xpRankNameText");
    expect(page).toContain("generateMetadata");
    /* And does not spell the arrangement out a second time. */
    expect(page).not.toMatch(/xpRankBadge\(/);
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
