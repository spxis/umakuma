import { describe, expect, it } from "vitest";

import { LADDER_STREAMS } from "@/lib/ladder/ladderStreams";
import { DEFAULT_RANKING_WEIGHTS, rankingScore } from "@/lib/ladder/rankingWeights";

import { ladderBoardPath, ladderBoardTabs, streamFromPath } from "./ladderAddress";
import { ladderLevelFor, rankLadderBoard, type LadderBoardAccount } from "./ladderBoard";

const member = (over: Partial<LadderBoardAccount> & { id: string }): LadderBoardAccount => ({
  slug: over.id,
  nickname: over.id,
  displayName: over.id,
  wkUsername: null,
  stream: LADDER_STREAMS.un,
  unLevel: 1,
  ugLevel: 1,
  learned: 0,
  passed: 0,
  burned: 0,
  ...over,
});

const names = (entries: { name: string }[]) => entries.map((entry) => entry.name);

/**
 * Two boards over one set of counts.
 *
 * `UkSrsState` is keyed by subject and both ladders order the same 2,235
 * kanji, so learned, passed and burned are identical on either path - only the
 * level differs. That is the whole reason the second board is nearly free, and
 * the property worth pinning is that the level is the only thing that moves.
 */
describe("which level a member is ranked on", () => {
  const both = member({ id: "a", stream: LADDER_STREAMS.ug, unLevel: 40, ugLevel: 12 });

  it("uses the board's path when the board names one", () => {
    expect(ladderLevelFor(both, LADDER_STREAMS.un)).toBe(40);
    expect(ladderLevelFor(both, LADDER_STREAMS.ug)).toBe(12);
  });

  /*
   * The care that makes the board of everyone honest. Ranking a UG member by
   * their UN level would rank them on a ladder they have never climbed: their
   * answers were given against the other ordering, and 95 kanji change level
   * between the two.
   */
  it("uses the member's own path on the board of everyone", () => {
    expect(ladderLevelFor(both, null)).toBe(12);
    expect(ladderLevelFor(member({ id: "b", unLevel: 40, ugLevel: 12 }), null)).toBe(40);
  });
});

describe("the board itself", () => {
  const people = [
    member({ id: "low", unLevel: 2, learned: 10, passed: 5, burned: 0 }),
    member({ id: "high", unLevel: 20, learned: 400, passed: 300, burned: 60 }),
    member({ id: "grade", stream: LADDER_STREAMS.ug, ugLevel: 9, learned: 200, passed: 150, burned: 20 }),
  ];

  it("ranks everyone on one board, best first", () => {
    expect(names(rankLadderBoard(people, DEFAULT_RANKING_WEIGHTS))).toEqual(["high", "grade", "low"]);
  });

  it("filters to one path without touching the counts", () => {
    const un = rankLadderBoard(people, DEFAULT_RANKING_WEIGHTS, LADDER_STREAMS.un);
    expect(names(un)).toEqual(["high", "low"]);
    const ug = rankLadderBoard(people, DEFAULT_RANKING_WEIGHTS, LADDER_STREAMS.ug);
    expect(names(ug)).toEqual(["grade"]);
    /* Same member, same counts, whichever board they appear on. */
    const everywhere = rankLadderBoard(people, DEFAULT_RANKING_WEIGHTS).find((e) => e.name === "grade")!;
    expect({ learned: everywhere.learned, passed: everywhere.passed, burned: everywhere.burned }).toEqual(
      { learned: ug[0]!.learned, passed: ug[0]!.passed, burned: ug[0]!.burned },
    );
  });

  it("scores with the tunable weights, not a formula of its own", () => {
    const entry = rankLadderBoard([people[1]!], DEFAULT_RANKING_WEIGHTS)[0]!;
    expect(entry.score).toBe(
      rankingScore({ level: 20, learned: 400, passed: 300, burned: 60 }, DEFAULT_RANKING_WEIGHTS),
    );
  });

  it("shares a place on a tie and skips the next, the way a race is scored", () => {
    const tied = [member({ id: "a", unLevel: 5 }), member({ id: "b", unLevel: 5 }), member({ id: "c", unLevel: 1 })];
    const board = rankLadderBoard(tied, DEFAULT_RANKING_WEIGHTS);
    expect(board.map((entry) => entry.place)).toEqual([1, 1, 3]);
  });

  it("draws an empty board rather than failing on one", () => {
    expect(rankLadderBoard([], DEFAULT_RANKING_WEIGHTS)).toEqual([]);
  });
});

/*
 * Three boards a member can link to and come back to, which is why the path
 * carries the stream rather than a query parameter.
 */
describe("the addresses", () => {
  it("reads the board of everyone from a bare address", () => {
    expect(streamFromPath(undefined)).toBeNull();
    expect(streamFromPath([])).toBeNull();
  });

  it("reads a path, in either case", () => {
    expect(streamFromPath(["un"])).toBe(LADDER_STREAMS.un);
    expect(streamFromPath(["UG"])).toBe(LADDER_STREAMS.ug);
  });

  /* undefined is a 404 and null is the full board: confusing the two would let
     a typo open a board the reader did not ask for. */
  it("refuses a segment that names no board", () => {
    for (const bad of [["wk"], ["un", "extra"], [""]]) {
      expect(streamFromPath(bad), JSON.stringify(bad)).toBeUndefined();
    }
  });

  it("writes each address back", () => {
    expect(ladderBoardPath(null)).toBe("/ladder");
    expect(ladderBoardPath(LADDER_STREAMS.un)).toBe("/ladder/un");
    expect(ladderBoardPath(LADDER_STREAMS.ug)).toBe("/ladder/ug");
  });

  it("offers one tab per board", () => {
    expect(ladderBoardTabs().map((tab) => tab.stream)).toEqual([null, LADDER_STREAMS.un, LADDER_STREAMS.ug]);
  });
});
