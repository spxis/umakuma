import { describe, expect, it } from "vitest";

import { XP_RANKS } from "@/lib/xp/xpCurve";

import { rankXpBoard, type XpBoardAccount } from "./xpBoard";
import { isXpRankLevel, xpRankBoard } from "./xpRankBoard";

const ACCOUNTS: XpBoardAccount[] = [
  { id: "a", slug: "ada", nickname: null, displayName: "Ada", wkUsername: null, xp: 5_000 },
  { id: "b", slug: "bo", nickname: null, displayName: "Bo", wkUsername: null, xp: 40 },
  { id: "c", slug: "cai", nickname: null, displayName: "Cai", wkUsername: null, xp: 30 },
  { id: "d", slug: "dee", nickname: null, displayName: "Dee", wkUsername: null, xp: 0 },
];

const board = rankXpBoard(ACCOUNTS);
const levelOf = (id: string) => board.find((entry) => entry.id === id)!.standing.level;

describe("one rank's own board", () => {
  it("keeps only the members standing at that rank", () => {
    const rank = xpRankBoard(board, levelOf("b"));

    expect(rank.entries.every((entry) => entry.standing.level === levelOf("b"))).toBe(true);
    expect(rank.entries.map((entry) => entry.id)).not.toContain("a");
  });

  /*
   * The placings are the board's, not the page's. Somebody 41st overall is
   * 41st here too: a place is a fact about the site, and renumbering them to
   * 1st on their own rank's page would be two different answers to "where am
   * I" on two pages of the same board.
   */
  it("keeps the placings the whole board gave them", () => {
    const rank = xpRankBoard(board, levelOf("c"));
    const onBoard = board.find((entry) => entry.id === "c")!;

    expect(rank.entries.find((entry) => entry.id === "c")!.place).toBe(onBoard.place);
  });

  it("names both ends, so a reader knows what this rank costs and what the next one does", () => {
    const rank = xpRankBoard(board, 2);

    expect(rank.needs).toBeGreaterThan(0);
    expect(rank.nextNeeds).toBeGreaterThan(rank.needs);
    expect(rank.nextName).not.toBeNull();
  });

  /* The top rank has nothing above it, and must say so rather than pointing
     at a rank 101 that does not exist. */
  it("has no next at the top of the ladder", () => {
    const rank = xpRankBoard(board, XP_RANKS);

    expect(rank.nextNeeds).toBeNull();
    expect(rank.nextName).toBeNull();
  });

  it("draws an empty rank without complaining", () => {
    expect(xpRankBoard(board, 77).entries).toEqual([]);
  });
});

describe("which levels are addressable", () => {
  it("accepts every rank on the ladder", () => {
    expect(isXpRankLevel(1)).toBe(true);
    expect(isXpRankLevel(XP_RANKS)).toBe(true);
    expect(isXpRankLevel("29")).toBe(true);
  });

  /* The level comes out of the URL, so anything can arrive: a page must 404
     rather than render a rank that does not exist. */
  it("refuses anything off it", () => {
    expect(isXpRankLevel(0)).toBe(false);
    expect(isXpRankLevel(XP_RANKS + 1)).toBe(false);
    expect(isXpRankLevel(2.5)).toBe(false);
    expect(isXpRankLevel("burned")).toBe(false);
    expect(isXpRankLevel(null)).toBe(false);
  });
});
