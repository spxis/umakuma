import { describe, expect, it } from "vitest";

import { KANJI_LADDER_LEVELS, kanjiLadderMilestones } from "@/lib/kanjiLadder";

import {
  PLACEMENT_BARS,
  PLACEMENT_MAX_BISECTIONS,
  PLACEMENT_MAX_PROBES,
  PLACEMENT_MILESTONE_RUNGS,
  PLACEMENT_PROBE_SIZE,
  nextPlacementStep,
  placementBlock,
  placementProbePassed,
  placementVerdict,
  type PlacementProbeResult,
  type PlacementVerdict,
} from "./placementStaircase";

/**
 * A scripted player.
 *
 * `trueLevel` is what they actually know: they clear a probe exactly when the
 * rung is at or below it. Everything the staircase is supposed to guarantee —
 * that a beginner is finished at once, that a strong reader gets to the top
 * inside ten probes, that nobody is ever placed above what they answered — is
 * a property of this walk rather than of one hand-written case, so most of
 * these tests run it and assert over the whole ladder.
 */
function playAt(
  trueLevel: number,
  { missBy = 2, stopAfter = Number.POSITIVE_INFINITY }: { missBy?: number; stopAfter?: number } = {},
): { verdict: PlacementVerdict; history: PlacementProbeResult[]; rungs: number[]; tiles: number[] } {
  const history: PlacementProbeResult[] = [];
  const rungs: number[] = [];
  const tiles: number[] = [];

  for (let guard = 0; guard <= PLACEMENT_MAX_PROBES + 2; guard += 1) {
    if (history.length >= stopAfter) break;
    const step = nextPlacementStep(history);
    if (step.done) return { verdict: step.verdict, history, rungs, tiles };

    const { rung, choiceCount } = step.probe;
    const bar = PLACEMENT_BARS[choiceCount];
    rungs.push(rung);
    tiles.push(choiceCount);
    history.push({
      rung,
      choiceCount,
      asked: PLACEMENT_PROBE_SIZE,
      correct: rung <= trueLevel ? bar : Math.max(0, bar - missBy),
    });
  }

  return { verdict: placementVerdict(history), history, rungs, tiles };
}

const EVERY_LEVEL = Array.from({ length: KANJI_LADDER_LEVELS }, (_, index) => index + 1);

describe("placementBlock", () => {
  it("asks from the five levels ending on the rung", () => {
    expect(placementBlock(5)).toEqual({ fromLevel: 1, toLevel: 5 });
    expect(placementBlock(35)).toEqual({ fromLevel: 31, toLevel: 35 });
    expect(placementBlock(100)).toEqual({ fromLevel: 96, toLevel: 100 });
  });
});

describe("placementProbePassed", () => {
  it("holds a different bar at each width, because chance is different", () => {
    /* Two tiles is a coin toss, so six of eight says nothing. */
    expect(placementProbePassed({ rung: 5, choiceCount: 2, asked: 8, correct: 6 })).toBe(false);
    expect(placementProbePassed({ rung: 5, choiceCount: 2, asked: 8, correct: 7 })).toBe(true);
    expect(placementProbePassed({ rung: 5, choiceCount: 3, asked: 8, correct: 6 })).toBe(true);
    expect(placementProbePassed({ rung: 5, choiceCount: 4, asked: 8, correct: 6 })).toBe(true);
    expect(placementProbePassed({ rung: 5, choiceCount: 4, asked: 8, correct: 5 })).toBe(false);
  });

  it("scales the bar to what was actually asked", () => {
    /* A thin block that could only fill four questions holds the same
       standard rather than becoming unpassable. */
    expect(placementProbePassed({ rung: 100, choiceCount: 4, asked: 4, correct: 3 })).toBe(true);
    expect(placementProbePassed({ rung: 100, choiceCount: 4, asked: 4, correct: 2 })).toBe(false);
  });
});

describe("the first probe", () => {
  it("starts at rung 5 with two tiles", () => {
    const step = nextPlacementStep([]);
    expect(step.done).toBe(false);
    if (step.done) return;
    expect(step.probe).toEqual({ rung: 5, choiceCount: 2, fromLevel: 1, toLevel: 5 });
  });
});

describe("a beginner", () => {
  it("is finished by the first probe", () => {
    const { verdict, rungs } = playAt(1);
    expect(rungs).toEqual([5]);
    expect(verdict.floor).toBe(1);
    expect(verdict.lastPassedRung).toBe(0);
    expect(verdict.probes).toBe(1);
  });

  it("is told level 1 with confidence, not with a shrug", () => {
    expect(playAt(1).verdict.confidence).toBe("high");
  });

  it("is not sure when the miss was by a single answer", () => {
    /* Six of eight at two tiles is a fail, but it is not a beginner. */
    expect(playAt(1, { missBy: 1 }).verdict.confidence).toBe("medium");
  });
});

describe("a strong player", () => {
  it("reaches the top of the ladder inside ten probes", () => {
    const { verdict, rungs } = playAt(KANJI_LADDER_LEVELS);
    expect(rungs).toEqual([...PLACEMENT_MILESTONE_RUNGS]);
    expect(rungs.length).toBeLessThanOrEqual(PLACEMENT_MAX_PROBES);
    expect(verdict.floor).toBe(KANJI_LADDER_LEVELS);
    expect(verdict.firstMissedRung).toBeNull();
    expect(verdict.confidence).toBe("high");
  });

  it("is asked harder choices as it climbs, and never easier ones", () => {
    const { tiles } = playAt(KANJI_LADDER_LEVELS);
    expect(tiles.slice(0, 3)).toEqual([2, 3, 4]);
    expect(tiles.every((count, index) => index === 0 || count >= tiles[index - 1]!)).toBe(true);
    expect(Math.max(...tiles)).toBe(4);
  });
});

describe("the bisection", () => {
  it("walks a mid-ladder reader down to one rung of doubt", () => {
    const { verdict, rungs } = playAt(27);
    expect(rungs).toEqual([5, 10, 20, 35, 30, 25]);
    expect(verdict.floor).toBe(26);
    expect(verdict.lastPassedRung).toBe(25);
    expect(verdict.firstMissedRung).toBe(30);
    expect(verdict.bracketWidth).toBe(5);
  });

  it("keeps a wrong answer from making the choices easier again", () => {
    const { tiles, rungs } = playAt(27);
    /* Three passes before the miss at 35, so every probe after it is four
       tiles: a bisection is not a second chance at a gentler question. */
    expect(rungs).toHaveLength(tiles.length);
    expect(tiles.slice(3)).toEqual([4, 4, 4]);
  });

  it("never asks the same rung twice", () => {
    for (const trueLevel of EVERY_LEVEL) {
      const { rungs } = playAt(trueLevel);
      expect(new Set(rungs).size, `rungs repeated at level ${trueLevel}`).toBe(rungs.length);
    }
  });

  it("only ever asks rungs on the five-level grid", () => {
    for (const trueLevel of EVERY_LEVEL) {
      for (const rung of playAt(trueLevel).rungs) {
        expect(rung % 5, `rung ${rung} is off the grid`).toBe(0);
        expect(rung).toBeGreaterThanOrEqual(5);
        expect(rung).toBeLessThanOrEqual(KANJI_LADDER_LEVELS);
      }
    }
  });
});

describe("the staircase over the whole ladder", () => {
  it("finishes inside its two caps for every reader", () => {
    for (const trueLevel of EVERY_LEVEL) {
      const { verdict, history } = playAt(trueLevel);
      expect(history.length, `level ${trueLevel} took ${history.length} probes`)
        .toBeLessThanOrEqual(PLACEMENT_MAX_PROBES);
      expect(verdict.probes).toBe(history.length);
    }
  });

  it("never places anybody above what they answered", () => {
    for (const trueLevel of EVERY_LEVEL) {
      const { verdict } = playAt(trueLevel);
      expect(verdict.floor, `level ${trueLevel} was placed at ${verdict.floor}`)
        .toBeLessThanOrEqual(trueLevel + 1);
    }
  });

  it("lands within a couple of rungs of the truth", () => {
    for (const trueLevel of EVERY_LEVEL) {
      const { verdict } = playAt(trueLevel);
      /* The floor is the rung above the last one they cleared, so the gap can
         only be as wide as the bracket the test was able to close. */
      expect(trueLevel - verdict.floor, `level ${trueLevel} placed at ${verdict.floor}`)
        .toBeLessThanOrEqual(8);
    }
  });

  it("spends at most three bisections after the first miss", () => {
    for (const trueLevel of EVERY_LEVEL) {
      const { history, rungs } = playAt(trueLevel);
      const firstMiss = history.findIndex((result) => !placementProbePassed(result));
      const bisections = firstMiss < 0 ? 0 : rungs.length - firstMiss - 1;
      expect(bisections, `level ${trueLevel} used ${bisections} bisections`)
        .toBeLessThanOrEqual(PLACEMENT_MAX_BISECTIONS);
    }
  });

  it("says how sure it is, and is unsure exactly when the bracket stayed wide", () => {
    for (const trueLevel of EVERY_LEVEL) {
      const { verdict } = playAt(trueLevel);
      const expected = verdict.bracketWidth > 10 ? "low" : verdict.bracketWidth > 5 ? "medium" : "high";
      expect(verdict.confidence, `level ${trueLevel} at width ${verdict.bracketWidth}`).toBe(expected);
    }
  });
});

describe("stopping early", () => {
  it("still buys the rungs already cleared, and says it is unsure", () => {
    /* Three clean probes and then the member walks away: 20 is answered for,
       and everything above it is not. The floor is theirs; the confidence is
       not, because the test never found the rung they could not do. */
    const { verdict } = playAt(60, { stopAfter: 3 });
    expect(verdict.floor).toBe(21);
    expect(verdict.lastPassedRung).toBe(20);
    expect(verdict.firstMissedRung).toBeNull();
    expect(verdict.confidence).toBe("low");
  });

  it("is unsure when the bracket was left wider than two rungs", () => {
    /* Passed 50, missed 75, and stopped before the search could narrow it. */
    const history: PlacementProbeResult[] = [
      { rung: 50, choiceCount: 4, asked: 8, correct: 8 },
      { rung: 75, choiceCount: 4, asked: 8, correct: 2 },
    ];
    const verdict = placementVerdict(history);
    expect(verdict.bracketWidth).toBe(25);
    expect(verdict.confidence).toBe("low");
    expect(verdict.floor).toBe(51);
  });

  it("has nothing to say about an empty test", () => {
    const verdict = placementVerdict([]);
    expect(verdict.floor).toBe(1);
    expect(verdict.probes).toBe(0);
  });
});

describe("the rung list", () => {
  it("carries every level a JLPT band completes on", () => {
    for (const milestone of kanjiLadderMilestones()) {
      expect(PLACEMENT_MILESTONE_RUNGS, `N${milestone.nLevel} completes at ${milestone.completeAtLevel}`)
        .toContain(milestone.completeAtLevel);
    }
  });

  it("climbs to the top of the ladder and no further", () => {
    expect(PLACEMENT_MILESTONE_RUNGS[PLACEMENT_MILESTONE_RUNGS.length - 1]).toBe(KANJI_LADDER_LEVELS);
    expect(PLACEMENT_MILESTONE_RUNGS.every((rung) => rung % 5 === 0)).toBe(true);
  });

  it("cannot spend both caps, so ten probes is the real limit", () => {
    expect(PLACEMENT_MILESTONE_RUNGS.length + PLACEMENT_MAX_BISECTIONS).toBe(PLACEMENT_MAX_PROBES);
  });
});
