import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  applyLadderOps,
  kanjiOf,
  LADDER_MAX_KANJI_PER_LEVEL,
  LADDER_REFUSALS,
  parseLadderOverrides,
} from "./ladderOps.mjs";

/**
 * An override that quietly did something reasonable would be a curriculum
 * nobody decided on. Every rule here is a refusal: the build stops and names
 * the op rather than shipping a ladder that broke one of its own promises.
 */

const band = (level: number, nLevel: number, kanji: string[]) => ({ level, nLevel, kanji });

/** Two JLPT bands, so a move can be tested for leaving its own. */
const levels = () => [
  band(1, 5, ["日", "一", "人"]),
  band(2, 5, ["年", "大"]),
  band(3, 4, ["語", "話"]),
];

const move = (key: string, toLevel: number, id = "op") => ({ id, op: "move" as const, kind: "kanji" as const, key, toLevel });

describe("replaying an admin's ladder changes", () => {
  it("moves a kanji, and leaves everything else where it was", () => {
    const { levels: after, refused } = applyLadderOps(levels(), [move("kanji:一", 2)]);
    expect(refused).toEqual([]);
    expect(after[0].kanji).toEqual(["日", "人"]);
    expect(after[1].kanji).toEqual(["年", "大", "一"]);
    expect(after[2].kanji).toEqual(["語", "話"]);
  });

  it("does not touch the levels it was given", () => {
    const original = levels();
    applyLadderOps(original, [move("kanji:一", 2)]);
    expect(original[0].kanji).toEqual(["日", "一", "人"]);
  });

  it("lets a later op supersede an earlier one on the same kanji", () => {
    const { levels: after } = applyLadderOps(levels(), [move("kanji:一", 2, "a"), move("kanji:一", 1, "b")]);
    expect(after[0].kanji).toContain("一");
    expect(after[1].kanji).not.toContain("一");
  });

  /*
   * The five refusals. Each one protects a promise the ladder's own test
   * suite makes, so an override cannot do what the build is forbidden to do.
   */
  it("refuses a kanji it has never heard of", () => {
    const { refused } = applyLadderOps(levels(), [move("kanji:朕", 2)]);
    expect(refused).toEqual([{ id: "op", key: "kanji:朕", reason: LADDER_REFUSALS.unknownKanji }]);
  });

  it("refuses a level that is not on the ladder", () => {
    expect(applyLadderOps(levels(), [move("kanji:一", 99)]).refused[0].reason).toBe(LADDER_REFUSALS.levelOutOfRange);
  });

  it("refuses to empty a level", () => {
    const only = [band(1, 5, ["日"]), band(2, 5, ["年"])];
    expect(applyLadderOps(only, [move("kanji:日", 2)]).refused[0].reason).toBe(LADDER_REFUSALS.wouldEmptyLevel);
  });

  it("refuses to overfill a level past the size the ladder is built for", () => {
    const full = Array.from({ length: LADDER_MAX_KANJI_PER_LEVEL }, (_, i) => `x${i}`);
    const packed = [band(1, 5, ["日", "一"]), band(2, 5, full)];
    expect(applyLadderOps(packed, [move("kanji:日", 2)]).refused[0].reason).toBe(LADDER_REFUSALS.wouldOverfillLevel);
  });

  /* The promise that every N5 kanji is taught by level 10 is not negotiable. */
  it("refuses to move a kanji past the level its band is promised complete by", () => {
    expect(applyLadderOps(levels(), [move("kanji:一", 3)]).refused[0].reason).toBe(
      LADDER_REFUSALS.landsAfterItsBand,
    );
  });

  /*
   * Early is allowed, and this is the direction the ops exist for. The ladder
   * promises every N4 kanji by a level, not that none arrives before the block
   * begins - so pulling one forward keeps the promise exactly, and is how a
   * school year's characters are gathered early enough for the exam ladder to
   * carry a grade milestone as well.
   */
  it("allows a kanji to be taught earlier than its band", () => {
    const { levels: after, refused } = applyLadderOps(levels(), [move("kanji:語", 2)]);
    expect(refused).toEqual([]);
    expect(after[1].kanji).toContain("語");
  });

  /* Level 1 is radicals alone; there is nowhere below it for a kanji's parts. */
  it("refuses a move into the radicals-only level", () => {
    const withEmptyFirst = [band(1, 5, []), band(2, 5, ["年", "大"]), band(3, 4, ["語", "話"])];
    expect(applyLadderOps(withEmptyFirst, [move("kanji:年", 1)]).refused[0].reason).toBe(
      LADDER_REFUSALS.intoTheRadicalLevel,
    );
  });

  it("reports every refusal rather than stopping at the first", () => {
    const { refused } = applyLadderOps(levels(), [move("kanji:朕", 2, "a"), move("kanji:一", 99, "b")]);
    expect(refused.map((entry) => entry.id)).toEqual(["a", "b"]);
  });

  it("adds and removes, and refuses a kanji the ladder already teaches", () => {
    const added = applyLadderOps(levels(), [{ id: "a", op: "add", kind: "kanji", key: "kanji:苺", toLevel: 2 }]);
    expect(added.levels[1].kanji).toContain("苺");
    expect(
      applyLadderOps(levels(), [{ id: "a", op: "add", kind: "kanji", key: "kanji:一", toLevel: 2 }]).refused[0].reason,
    ).toBe(LADDER_REFUSALS.alreadyPresent);

    const removed = applyLadderOps(levels(), [{ id: "r", op: "remove", kind: "kanji", key: "kanji:一" }]);
    expect(removed.levels[0].kanji).toEqual(["日", "人"]);
  });

  it("reads a kanji key and refuses every other kind", () => {
    expect(kanjiOf("kanji:語")).toBe("語");
    expect(kanjiOf("radical:口")).toBeNull();
    expect(kanjiOf("wk:2467")).toBeNull();
    expect(kanjiOf("kanji:")).toBeNull();
  });
});

/* A file somebody hand-edited must not be able to stop a build. */
describe("reading the overrides file", () => {
  it.each([
    ["not JSON", "{oh dear"],
    ["no ops", "{}"],
    ["ops that are not a list", '{"ops":{}}'],
  ])("reads %s as no overrides", (_label, raw) => {
    expect(parseLadderOverrides(raw)).toEqual([]);
  });

  it("drops a malformed op and keeps the rest", () => {
    const raw = JSON.stringify({
      version: 1,
      ops: [
        { id: "a", op: "move", kind: "kanji", key: "kanji:語", toLevel: 9 },
        { id: "b", op: "teleport", kind: "kanji", key: "kanji:話" },
        { op: "move", key: "kanji:話" },
      ],
    });
    expect(parseLadderOverrides(raw).map((op) => op.id)).toEqual(["a"]);
  });

  it("ships with an empty overrides file, so a fresh clone rebuilds unchanged", () => {
    const file = readFileSync(join(process.cwd(), "src/data/kanjiLadderOverrides.json"), "utf8");
    expect(parseLadderOverrides(file)).toEqual([]);
  });
});

/*
 * The build imports this module rather than carrying its own copy. Two
 * implementations of "what a move means" would drift, and the ladder would
 * come out differently depending on who applied the op.
 */
describe("one implementation of what an op means", () => {
  it("is imported by the build, not reimplemented in it", () => {
    const build = readFileSync(join(process.cwd(), "scripts/build-kanji-ladder.mjs"), "utf8");
    expect(build).toContain("applyLadderOps");
    expect(build).toContain("ladderOps.mjs");
    /* If the build ever grows its own rules, this fails. */
    expect(build).not.toContain("wouldEmptyLevel");
  });
});
