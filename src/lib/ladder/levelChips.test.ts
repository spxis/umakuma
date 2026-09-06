import { describe, expect, it } from "vitest";

import { LADDER_LEVEL_GROUP_SIZE, ladderLevelChips } from "./levelChips";

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
