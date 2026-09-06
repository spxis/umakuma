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

  /*
   * A page that promises what nothing pays is the same broken promise as a
   * retired kind, and it shipped that way: `XpType` also holds every proposed
   * kind so it can be priced in the admin screen before it is built, and the
   * page listed all of them - 300 XP of game awards no code path had ever
   * paid, plus a curriculum-level award that is unwired on purpose.
   *
   * Asserted against the maps rather than a list of names, because the list
   * has to stay right by itself: `xpProposedAwards.ts` says a kind leaves it
   * when something fires it, so wiring an award moves it into XP_AWARDS or
   * XP_BONUSES and it appears here on the same commit.
   */
  it("offers only the kinds something actually pays", async () => {
    const { XP_AWARDS, XP_BONUSES, XP_UNAWARDED_KINDS } = await import("@/lib/xp/xpAwards");
    const { XP_PROPOSED_AWARDS } = await import("@/lib/xp/xpProposedAwards");

    expect(loader).toContain("id: { in: WIRED_KINDS }");

    const wired = new Set(
      [...Object.keys(XP_AWARDS), ...Object.keys(XP_BONUSES)].filter(
        (kind) => !(XP_UNAWARDED_KINDS as string[]).includes(kind),
      ),
    );
    for (const proposed of Object.keys(XP_PROPOSED_AWARDS)) {
      expect(wired.has(proposed)).toBe(false);
    }
    for (const unawarded of XP_UNAWARDED_KINDS) {
      expect(wired.has(unawarded)).toBe(false);
    }
    /* And the three the games now pay are on it, which is the fix that let
       them off the proposed list in the first place. */
    for (const paid of ["flawlessGame", "personalBest", "mapCleared"]) {
      expect(wired.has(paid)).toBe(true);
    }
  });

  it("says which kinds have no ceiling rather than printing a blank", () => {
    const copy = read("src/app/xp/xpBoardCopy.ts");
    expect(copy).toContain("uncapped:");
    expect(copy).toContain("capNote:");
  });
});
