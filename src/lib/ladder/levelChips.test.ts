import { describe, expect, it } from "vitest";

import {
  LADDER_LEVEL_GROUP_SIZE,
  groupOpensAtLevel,
  ladderGroupOpensAt,
  ladderLevelChips,
  sparseGroupOpensAt,
} from "./levelChips";

const label = (chip: ReturnType<typeof ladderLevelChips>[number]): string =>
  chip.kind === "level" ? String(chip.level) : `${chip.startLevel}-${chip.endLevel}`;

/**
 * A hundred levels, made readable.
 *
 * The row scrolled sideways and showed the first twenty-one, so the property
 * worth pinning is that every level is still reachable: one decade open, the
 * other nine shut, and nothing falling between them.
 */
describe("the ladder's level chips", () => {
  it("opens the decade holding the level being read, and shuts the rest", () => {
    expect(ladderLevelChips(100, 24).map(label)).toEqual([
      "1-10",
      "11-20",
      "21", "22", "23", "24", "25", "26", "27", "28", "29", "30",
      "31-40",
      "41-50",
      "51-60",
      "61-70",
      "71-80",
      "81-90",
      "91-100",
    ]);
  });

  it("opens the first decade for level 1 and the last for level 100", () => {
    expect(ladderLevelChips(100, 1)[0]).toEqual({ kind: "level", level: 1 });
    const last = ladderLevelChips(100, 100);
    expect(last[last.length - 1]).toEqual({ kind: "level", level: 100 });
  });

  /* Ten chips is the whole point: a reader sees the shape of the ladder rather
     than dragging a row of a hundred. */
  it("never draws more than one decade of singles", () => {
    for (let level = 1; level <= 100; level += 1) {
      const chips = ladderLevelChips(100, level);
      expect(chips.filter((chip) => chip.kind === "level")).toHaveLength(LADDER_LEVEL_GROUP_SIZE);
      expect(chips).toHaveLength(9 + LADDER_LEVEL_GROUP_SIZE);
    }
  });

  it("leaves no level unreachable, whichever decade is open", () => {
    const reachable = new Set<number>();
    for (const chip of ladderLevelChips(100, 55)) {
      if (chip.kind === "level") reachable.add(chip.level);
      else for (let level = chip.startLevel; level <= chip.endLevel; level += 1) reachable.add(level);
    }
    expect(reachable.size).toBe(100);
  });

  /* A ladder that does not divide evenly - UG is not a hundred - must not lose
     its tail or invent levels past its end. */
  it("closes a short last group at the ladder's own end", () => {
    expect(ladderLevelChips(87, 5).map(label)).toContain("81-87");
    expect(ladderLevelChips(87, 5).map(label)).not.toContain("81-90");
  });

  it("draws nothing for a ladder with no levels", () => {
    expect(ladderLevelChips(0, 1)).toEqual([]);
  });
});

/**
 * Which level a shut group lands you on.
 *
 * It was its first, always, and that is only right going up. John, on landing
 * at 11 after pressing 11-20 from level 21: "select the last item of that
 * group, which makes more sense than selecting the lowest item, since that is
 * further away than the level you were just on." The near edge, both ways.
 */
describe("the level a shut group opens on", () => {
  it("opens a group above you on its lowest, which is the next level along", () => {
    expect(groupOpensAtLevel(19, 21, 30)).toBe(21);
  });

  it("opens a group below you on its highest, which is the nearest it has", () => {
    /* The bug as reported: from 21 this landed on 11, nine levels further away
       than the level the reader had just been standing on. */
    expect(groupOpensAtLevel(21, 11, 20)).toBe(20);
  });

  it("is the near edge right up against the boundary in both directions", () => {
    expect(groupOpensAtLevel(20, 21, 30)).toBe(21);
    expect(groupOpensAtLevel(31, 21, 30)).toBe(30);
  });

  it("stays where it is when the group is the one already holding you", () => {
    /* Out of reach through the chips - the decade holding the reader is the
       open one, so it is never a group - but a pure function should not move
       somebody who is already inside. */
    expect(groupOpensAtLevel(25, 21, 30)).toBe(25);
  });

  it("takes the highest when nothing is chosen yet", () => {
    /* No direction to be near to, and the highest is the most recent - which
       is where both explorers already put a reader. */
    expect(groupOpensAtLevel(null, 11, 20)).toBe(20);
  });

  it("reads the bounds off a ladder chip", () => {
    const groups = ladderLevelChips(100, 24).filter((chip) => chip.kind === "group");
    const below = groups.find((chip) => chip.startLevel === 1)!;
    const above = groups.find((chip) => chip.startLevel === 51)!;
    expect(ladderGroupOpensAt(below, 24)).toBe(10);
    expect(ladderGroupOpensAt(above, 24)).toBe(51);
  });
});

/**
 * The same rule where the row is sparse.
 *
 * History draws a decade for the attempts a member actually has, so 11-20 can
 * mean 11, 12, 17 and 18 alone. The decade's own bounds are not places anybody
 * can land, and landing on an empty level is the one way the near edge goes
 * wrong.
 */
describe("a group whose levels are sparse", () => {
  const present = new Set([11, 12, 17, 18]);

  it("lands on the highest level it actually holds, not the decade's end", () => {
    expect(sparseGroupOpensAt(25, 11, 20, present)).toBe(18);
  });

  it("lands on the lowest it actually holds when the group is above you", () => {
    expect(sparseGroupOpensAt(5, 11, 20, present)).toBe(11);
  });

  it("has nowhere to land when the group holds nothing", () => {
    expect(sparseGroupOpensAt(25, 31, 40, present)).toBeNull();
  });

  it("agrees with the dense rule when every level is there", () => {
    const everyLevel = new Set(Array.from({ length: 10 }, (_, index) => index + 11));
    expect(sparseGroupOpensAt(25, 11, 20, everyLevel)).toBe(groupOpensAtLevel(25, 11, 20));
    expect(sparseGroupOpensAt(5, 11, 20, everyLevel)).toBe(groupOpensAtLevel(5, 11, 20));
  });
});
