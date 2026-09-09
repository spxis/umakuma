import { describe, expect, it } from "vitest";

import { GAME_PRACTICE_LISTS, GAME_PRACTICE_LIST_VALUES } from "./gameMode";
import { areConfusable, confusablesFor } from "./kanjiConfusables";

/*
 * John: "It might even be a special mode where you review confusing items."
 *
 * The contrast is the lesson, so the two have to be on the board together -
 * a drill that shows 未 this round and 末 three rounds later has taught
 * nothing the ordinary queue does not.
 */
describe("the look-alikes drill", () => {
  it("is a practice list rather than a game kind", () => {
    /* Nothing new is persisted: `practiceList` picks the pool and the run is
       still stored as a `revenge`, so no Prisma enum moves. */
    expect(GAME_PRACTICE_LIST_VALUES).toContain(GAME_PRACTICE_LISTS.confusables);
  });

  it("knows pairs in both directions, which is what a drill needs", () => {
    const [first] = confusablesFor("未");

    expect(first, "未 has a look-alike").toBeDefined();
    expect(areConfusable("未", first!.kanji)).toBe(true);
    expect(areConfusable(first!.kanji, "未")).toBe(true);
  });

  it("has nothing to say about a character with no twin", () => {
    expect(confusablesFor("一二三四五六七八九十".slice(0, 0) || "〜")).toEqual([]);
  });
});

/*
 * The gate the ticket asked for: "a pair whose twin is 40 levels ahead is not
 * worth drilling yet." The pool the player is learning from is that gate, so
 * the target set is an intersection rather than the whole confusables file.
 */
describe("the pool is the gate", () => {
  function targetsIn(characters: string[]): string[] {
    const present = new Set(characters);
    return characters.filter((character) =>
      confusablesFor(character).some((neighbour) => present.has(neighbour.kanji)),
    );
  }

  it("keeps a character whose twin is in the same pool", () => {
    const twin = confusablesFor("未")[0]!.kanji;

    expect(targetsIn(["未", twin])).toContain("未");
  });

  it("drops a character whose twin is not", () => {
    expect(targetsIn(["未"])).toEqual([]);
  });
});
