import { describe, expect, it } from "vitest";

import { xpForLevel } from "@/lib/xp/xpCurve";
import { xpRankName } from "@/lib/xp/xpRanks";

import { canOpenXpBoardRow, rankXpBoard, xpBoardPlacement, type XpBoardAccount } from "./xpBoard";
import { ordinal } from "../xpBoardCopy";

function account(overrides: Partial<XpBoardAccount> & { id: string; xp: number }): XpBoardAccount {
  return {
    slug: overrides.id,
    nickname: null,
    displayName: null,
    wkUsername: null,
    ...overrides,
  };
}

describe("rankXpBoard", () => {
  it("puts the largest total first whatever order it arrives in", () => {
    const entries = rankXpBoard([
      account({ id: "b", xp: 400 }),
      account({ id: "a", xp: 900 }),
      account({ id: "c", xp: 10 }),
    ]);

    expect(entries.map((entry) => entry.id)).toEqual(["a", "b", "c"]);
    expect(entries.map((entry) => entry.place)).toEqual([1, 2, 3]);
  });

  /*
   * The edge the whole module exists for. Two members on the same total are
   * both second, and the next is fourth - the placing after a tie skips, the
   * way a race is scored.
   */
  it("shares a place on a tie and skips the next one", () => {
    const entries = rankXpBoard([
      account({ id: "a", xp: 900 }),
      account({ id: "b", xp: 400 }),
      account({ id: "c", xp: 400 }),
      account({ id: "d", xp: 10 }),
    ]);

    expect(entries.map((entry) => entry.place)).toEqual([1, 2, 2, 4]);
  });

  it("breaks a tie by name so the order does not wander between requests", () => {
    const first = rankXpBoard([
      account({ id: "zoe", xp: 400, displayName: "Zoe" }),
      account({ id: "ada", xp: 400, displayName: "Ada" }),
    ]);
    const second = rankXpBoard([
      account({ id: "ada", xp: 400, displayName: "Ada" }),
      account({ id: "zoe", xp: 400, displayName: "Zoe" }),
    ]);

    expect(first.map((entry) => entry.name)).toEqual(["Ada", "Zoe"]);
    expect(second.map((entry) => entry.name)).toEqual(first.map((entry) => entry.name));
  });

  /*
   * A member on day one is on this board. That is the difference from the
   * WaniKani board, and it is worth a test rather than a comment: zero XP is
   * rank 1 with nothing into it, not an absent row.
   */
  it("lists a member who has earned nothing yet", () => {
    const [entry] = rankXpBoard([account({ id: "new", xp: 0 })]);

    expect(entry.place).toBe(1);
    expect(entry.standing.level).toBe(1);
    expect(entry.standing.into).toBe(0);
    expect(entry.rankName).toBe(xpRankName(1));
  });

  it("reports the rank the total has actually earned", () => {
    const [entry] = rankXpBoard([account({ id: "a", xp: xpForLevel(12) })]);

    expect(entry.standing.level).toBe(12);
    expect(entry.rankName).toBe(xpRankName(12));
    expect(entry.standing.into).toBe(0);
  });

  it("names a member by what they chose, then the invite, then the address", () => {
    const entries = rankXpBoard([
      account({ id: "a", xp: 3, displayName: "Chosen", nickname: "Invited" }),
      account({ id: "b", xp: 2, nickname: "Invited" }),
      account({ id: "c", xp: 1, slug: "just-a-slug" }),
    ]);

    expect(entries.map((entry) => entry.name)).toEqual(["Chosen", "Invited", "just-a-slug"]);
  });

  it("falls back to the WaniKani username when there is no slug", () => {
    const [entry] = rankXpBoard([account({ id: "a", xp: 1, slug: null, wkUsername: "wkname" })]);

    expect(entry.address).toBe("wkname");
  });
});

describe("xpBoardPlacement", () => {
  const entries = rankXpBoard([account({ id: "a", xp: 900 }), account({ id: "b", xp: 400 })]);

  it("finds the viewer's own row", () => {
    expect(xpBoardPlacement(entries, "b")?.place).toBe(2);
  });

  it("answers null for a viewer with no account and one who is not listed", () => {
    expect(xpBoardPlacement(entries, null)).toBeNull();
    expect(xpBoardPlacement(entries, "missing")).toBeNull();
  });
});

describe("canOpenXpBoardRow", () => {
  const [mine, theirs] = rankXpBoard([
    account({ id: "a", xp: 900, slug: "Ada" }),
    account({ id: "b", xp: 400, slug: "zoe" }),
  ]);

  it("opens your own row and nobody else's", () => {
    expect(canOpenXpBoardRow(mine, { isAdmin: false, address: "ada" })).toBe(true);
    expect(canOpenXpBoardRow(theirs, { isAdmin: false, address: "ada" })).toBe(false);
  });

  it("opens every row for an admin", () => {
    expect(canOpenXpBoardRow(theirs, { isAdmin: true, address: null })).toBe(true);
  });

  it("opens nothing for a visitor with no address", () => {
    expect(canOpenXpBoardRow(mine, { isAdmin: false, address: null })).toBe(false);
  });
});

describe("ordinal", () => {
  it("reads a placing the way somebody would say it", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101].map(ordinal)).toEqual([
      "1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "23rd", "101st",
    ]);
  });
});
