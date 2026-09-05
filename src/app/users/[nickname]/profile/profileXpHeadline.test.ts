import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { XP_RANKS, xpForLevel, xpStanding } from "@/lib/xp/xpCurve";
import { xpRankBadge, xpRankName } from "@/lib/xp/xpRanks";

import { PROFILE_XP_HEADLINE_COPY as copy } from "./profileCopy";

describe("the XP line in the profile header", () => {
  const component = readFileSync("src/app/users/[nickname]/profile/ProfileXpHeadline.tsx", "utf8");
  const page = readFileSync("src/app/users/[nickname]/profile/page.tsx", "utf8");

  it("is in the header rather than only in the card below", () => {
    expect(page).toContain("actions={<ProfileXpHeadline xp={account.xp} />}");
  });

  it("says the total, the rung and what is left", () => {
    expect(component).toContain("copy.total(xp)");
    expect(component).toContain("xpRankBadge(standing.level)");
    expect(component).toContain("copy.toNext(standing.toNext, next.name)");
  });

  /* The stored xpLevel is materialised; the total beside it is not. This page
     shows both, so it derives rather than reads - the same call XpRankPanel
     makes, for the same reason. */
  it("derives the rank from the XP rather than the stored level", () => {
    expect(component).toContain("xpStanding(xp)");
    /* The total is the only thing it is handed, so there is no stored level
       for it to disagree with. Asserted on the signature rather than by
       grepping the file, whose comment explains the choice. */
    expect(component).toContain("{ xp }: { xp: number }");
  });

  it("reads the way John asked for it", () => {
    const standing = xpStanding(xpForLevel(10));
    const line = copy.rank(xpRankBadge(standing.level), xpRankName(standing.level));
    expect(line).toBe(`L10 ${xpRankName(10)}`);
    expect(copy.total(50_000)).toBe("50,000 XP");
  });

  it("names what the next rank is, not only the number", () => {
    expect(copy.toNext(3_240, "Old Hand")).toBe("3,240 XP to Old Hand");
  });

  it("says something other than a countdown at the top of the ladder", () => {
    const standing = xpStanding(xpForLevel(XP_RANKS));
    expect(standing.level).toBe(XP_RANKS);
    expect(standing.toNext).toBe(0);
    expect(copy.atTop.length).toBeGreaterThan(0);
    expect(component).toContain("next ? copy.toNext");
  });

  it("starts a member with no XP at rank 1 rather than at nothing", () => {
    const standing = xpStanding(0);
    expect(standing.level).toBe(1);
    expect(copy.total(0)).toBe("0 XP");
  });
});
