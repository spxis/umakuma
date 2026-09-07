import { describe, expect, it } from "vitest";

import { GRADE_LADDER_LEVELS } from "@/lib/gradeLadder";
import { KANJI_LADDER_LEVELS, levelForJlpt } from "@/lib/kanjiLadder";
import { LADDER_STREAMS } from "@/lib/ladder/ladderStreams";

import { ALL_LADDER_COLUMNS, ladderColumns } from "./ladderColumns";

/**
 * Two ladders, one lookup, and the thing that made the lookup necessary.
 *
 * Every UG member was taught in UN order and gated on UN's milestone levels,
 * because the queue, the lesson gate, the resolver and the gates each named
 * `unLevel` and `level` outright. This is the one place that says which
 * column and which milestones belong to which ladder; the tests pin that the
 * two cases really differ, since a lookup that returned UN for both would pass
 * every test that does not check.
 */
describe("which columns a ladder uses", () => {
  it("points UN at the UN columns and UG at the UG ones", () => {
    expect(ladderColumns(LADDER_STREAMS.un)).toMatchObject({
      subjectLevel: "level",
      accountLevel: "unLevel",
      accountFloor: "unLevelFloor",
      accountUpdatedAt: "unLevelUpdatedAt",
      maxLevel: KANJI_LADDER_LEVELS,
    });
    expect(ladderColumns(LADDER_STREAMS.ug)).toMatchObject({
      subjectLevel: "ugLevel",
      accountLevel: "ugLevel",
      accountFloor: "ugLevelFloor",
      accountUpdatedAt: "ugLevelUpdatedAt",
      maxLevel: GRADE_LADDER_LEVELS,
    });
  });

  /*
   * The gates are the part a shared lookup would get silently wrong. N4 is
   * the same exam on either path, but its last kanji is taught at level 20
   * on UN and 43 on UG - so a UG member held at 20 would be sitting a final
   * on kanji they have not met.
   */
  it("puts the same JLPT band on different levels per ladder", () => {
    const un = ladderColumns(LADDER_STREAMS.un).jlptMilestones;
    const ug = ladderColumns(LADDER_STREAMS.ug).jlptMilestones;
    const at = (list: typeof un, n: number) => list.find((m) => m.nLevel === n)?.completeAtLevel;
    expect(at(un, 4)).toBe(levelForJlpt(4));
    expect(at(un, 4)).toBe(20);
    expect(at(ug, 4)).toBe(43);
    expect(at(un, 5)).toBe(10);
    expect(at(ug, 5)).toBe(7);
  });

  it("has all five bands on both ladders, each finishing once", () => {
    for (const columns of ALL_LADDER_COLUMNS) {
      const bands = columns.jlptMilestones.map((m) => m.nLevel).sort();
      expect(bands, columns.stream).toEqual([1, 2, 3, 4, 5]);
      for (const m of columns.jlptMilestones) {
        expect(Number.isInteger(m.completeAtLevel) && m.completeAtLevel >= 1 && m.completeAtLevel <= columns.maxLevel, `${columns.stream} N${m.nLevel}`).toBe(true);
      }
    }
  });

  it("lists every ladder exactly once, for the code that syncs them all", () => {
    expect(ALL_LADDER_COLUMNS.map((c) => c.stream)).toEqual([LADDER_STREAMS.un, LADDER_STREAMS.ug]);
  });
});
