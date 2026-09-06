import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

/**
 * The page must be generated, not written.
 *
 * SPX's How to Gain XP was a hand-written list of numbers, and ours cannot be:
 * `XpType` is what `awardXp` charges against and an admin can retune any of it
 * from the site, so a typed figure would be wrong the first time somebody did.
 * These guard the property rather than the pixels.
 */
describe("the how-to-earn page", () => {
  const page = read("src/app/xp/earn/page.tsx");
  const loader = read("src/app/xp/lib/xpEarnServer.ts");

  it("reads its numbers from the table the awards are paid from", () => {
    expect(loader).toContain("prisma.xpType.findMany");
    expect(page).toContain("loadXpEarnRows");
  });

  /* The tell for a hand-written price: a bare number beside an XP word in the
     page's own source. Copy lives in the copy module; figures come from rows. */
  it("hard-codes no amount of its own", () => {
    expect(page).not.toMatch(/\b\d+\s*XP\b/);
  });

  /*
   * Retired kinds keep their rows so old history still explains itself, and
   * must not be offered as a way to earn.
   */
  it("leaves retired kinds out", () => {
    expect(loader).toContain("retiredAt: null");
  });

  it("says which kinds have no ceiling rather than printing a blank", () => {
    const copy = read("src/app/xp/xpBoardCopy.ts");
    expect(copy).toContain("uncapped:");
    expect(copy).toContain("capNote:");
  });
});
