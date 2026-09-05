import { type GameChoiceCount } from "@/lib/gameBoard";
import { KANJI_LADDER_LEVELS } from "@/lib/kanjiLadder";

/**
 * Where somebody already reading Japanese joins the ladder.
 *
 * A newcomer starts at level 1 with thirty-four radicals. Somebody who has read
 * for years has, until now, had no way to say so unless they held a WaniKani
 * account to import. This is that way, and it is a staircase rather than a
 * questionnaire: we ask eight questions from one rung, and what they answer
 * decides which rung is asked next.
 *
 * Three ideas hold it together.
 *
 * 1. **Climb by milestone, then bisect.** While the answers keep coming back
 *    right we jump — 5, 10, 20, 35, 50, 75, 100 — because a reader at level 60
 *    should not sit through eleven probes on the way up. The first miss turns
 *    the climb into a search: we already know a rung they passed and a rung
 *    they did not, and the answer is between the two.
 * 2. **Harder as it goes.** The first probe offers two tiles, and every pass
 *    adds one to a maximum of four. Two tiles is a coin toss and a beginner
 *    deserves the gentle version; by rung 35 a pass has to mean something.
 *    Tiles never come back down, so a later probe is never easier evidence
 *    than one already passed.
 * 3. **Bars corrected for guessing.** Chance is 50%, 33% and 25% across the
 *    three widths, so the bar cannot be one number. Seven of eight at two
 *    tiles is p ≈ 0.035 by luck; six of eight at four tiles is p ≈ 0.004.
 *
 * Everything here is pure — history in, next probe or verdict out — because
 * this is the part that has to be right, and a staircase that needs a database
 * to test is a staircase nobody tests.
 */

/** One rung is five ladder levels; the ladder's gates sit on the same grid. */
export const PLACEMENT_RUNG_STEP = 5;
export const PLACEMENT_TOP_RUNG = KANJI_LADDER_LEVELS;

/** Eight questions: five kanji and three words from the rung's own block. */
export const PLACEMENT_PROBE_KANJI = 5;
export const PLACEMENT_PROBE_WORDS = 3;
export const PLACEMENT_PROBE_SIZE = PLACEMENT_PROBE_KANJI + PLACEMENT_PROBE_WORDS;

/**
 * The rungs the climb jumps between.
 *
 * The JLPT completion levels, which is what a reader can actually say about
 * themselves ("I have N3"), plus 5 at the bottom so a beginner is finished in
 * one probe and 75 at the top so the last gap is not twenty-five levels wide.
 * `placementStaircase.test.ts` fails if a ladder rebuild moves a milestone off
 * this list.
 */
export const PLACEMENT_MILESTONE_RUNGS: readonly number[] = [5, 10, 20, 35, 50, 75, 100];

/** Right answers out of eight, by tile count. Guessing is worth 4, 2.7 and 2. */
export const PLACEMENT_BARS: Record<GameChoiceCount, number> = { 2: 7, 3: 6, 4: 6 };

export const PLACEMENT_FIRST_CHOICE_COUNT: GameChoiceCount = 2;
export const PLACEMENT_MAX_CHOICE_COUNT: GameChoiceCount = 4;

/** Ten probes is about six minutes, and the caps below cannot both be spent. */
export const PLACEMENT_MAX_PROBES = 10;
export const PLACEMENT_MAX_BISECTIONS = 3;

export type PlacementProbeResult = {
  rung: number;
  choiceCount: GameChoiceCount;
  /** Usually eight. Fewer when the rung's block could not fill a probe. */
  asked: number;
  correct: number;
};

export type PlacementConfidence = "high" | "medium" | "low";

export type PlacementVerdict = {
  /** The level they start on: the rung above the highest one they passed. */
  floor: number;
  lastPassedRung: number;
  /** Null when nothing was missed, which only happens at the top of the ladder. */
  firstMissedRung: number | null;
  /** How wide the bracket was left. Five is as narrow as it gets. */
  bracketWidth: number;
  confidence: PlacementConfidence;
  probes: number;
};

export type PlacementProbeRequest = {
  rung: number;
  choiceCount: GameChoiceCount;
  /** Lowest level the probe draws from: the block is `(rung − 4 … rung]`. */
  fromLevel: number;
  toLevel: number;
};

export type PlacementStep =
  | { done: false; probe: PlacementProbeRequest }
  | { done: true; verdict: PlacementVerdict };

/** The block a rung asks from: five levels ending on the rung itself. */
export function placementBlock(rung: number): { fromLevel: number; toLevel: number } {
  return { fromLevel: Math.max(1, rung - PLACEMENT_RUNG_STEP + 1), toLevel: rung };
}

/**
 * Whether a probe cleared its bar.
 *
 * Scaled by what was actually asked rather than compared to eight, so a rung
 * whose block is thin — the last one on the ladder, or a curriculum mid-edit —
 * holds the same standard instead of becoming impossible.
 */
export function placementProbePassed(result: PlacementProbeResult): boolean {
  const bar = PLACEMENT_BARS[result.choiceCount];
  return result.correct * PLACEMENT_PROBE_SIZE >= bar * result.asked;
}

/** A miss by a single answer. Evidence, but not the kind to be sure about. */
function placementProbeNearMiss(result: PlacementProbeResult): boolean {
  if (placementProbePassed(result)) return false;
  const bar = PLACEMENT_BARS[result.choiceCount];
  return (result.correct + 1) * PLACEMENT_PROBE_SIZE >= bar * result.asked;
}

type PlacementBracket = {
  /** Highest rung passed, or 0 when the first probe was missed. */
  low: number;
  /** Lowest rung missed, or null while the climb is still clean. */
  high: number | null;
  passes: number;
  bisections: number;
};

function readBracket(history: readonly PlacementProbeResult[]): PlacementBracket {
  let low = 0;
  let high: number | null = null;
  let passes = 0;
  let firstMissAt = -1;

  history.forEach((result, index) => {
    if (placementProbePassed(result)) {
      passes += 1;
      if (result.rung > low) low = result.rung;
      return;
    }
    if (high === null || result.rung < high) high = result.rung;
    if (firstMissAt < 0) firstMissAt = index;
  });

  /* Every probe after the first miss is a bisection: the climb is over the
     moment there is something to search between. */
  const bisections = firstMissAt < 0 ? 0 : history.length - firstMissAt - 1;
  return { low, high, passes, bisections };
}

/** Two tiles, then three, then four. One per pass, and never back down. */
function nextChoiceCount(passes: number): GameChoiceCount {
  const count = PLACEMENT_FIRST_CHOICE_COUNT + passes;
  return (count > PLACEMENT_MAX_CHOICE_COUNT ? PLACEMENT_MAX_CHOICE_COUNT : count) as GameChoiceCount;
}

/** The next milestone above a rung, or null at the top. */
function nextMilestoneAbove(rung: number): number | null {
  return PLACEMENT_MILESTONE_RUNGS.find((milestone) => milestone > rung) ?? null;
}

/**
 * The rung to ask next when searching a bracket.
 *
 * Rounded onto the five-level grid and kept strictly inside the bracket, so a
 * bisection can never re-ask a rung already answered.
 */
function bisectRung(low: number, high: number): number {
  const midpoint = Math.round((low + high) / 2 / PLACEMENT_RUNG_STEP) * PLACEMENT_RUNG_STEP;
  return Math.min(Math.max(midpoint, low + PLACEMENT_RUNG_STEP), high - PLACEMENT_RUNG_STEP);
}

/**
 * How much the verdict is worth.
 *
 * Width first: a bracket closed to five levels is one rung of doubt, and
 * anything wider is where the test stopped rather than where it finished. A
 * miss by one answer takes the top grade off, because the bar sitting between
 * six and seven right is not a wall the member fell short of by much.
 */
function placementConfidence({
  bracketWidth,
  decidingMiss,
}: {
  bracketWidth: number;
  decidingMiss: PlacementProbeResult | null;
}): PlacementConfidence {
  if (bracketWidth > PLACEMENT_RUNG_STEP * 2) return "low";
  if (bracketWidth > PLACEMENT_RUNG_STEP) return "medium";
  return decidingMiss && placementProbeNearMiss(decidingMiss) ? "medium" : "high";
}

/**
 * The verdict from whatever has been answered.
 *
 * Exported because a member may stop halfway, and stopping should still buy
 * them the rungs they cleared. A short test comes back with a wide bracket and
 * low confidence, which is the honest description of it.
 */
export function placementVerdict(history: readonly PlacementProbeResult[]): PlacementVerdict {
  const { low, high } = readBracket(history);
  /* Nothing missed means one of two very different things. At the top of the
     ladder there is nothing left to miss, and the answer is exact. Anywhere
     else it means the member stopped climbing, and everything above the rung
     they cleared is unanswered — so the bracket runs to the top and the
     verdict says as much rather than claiming one rung of doubt. */
  const bracketWidth =
    high !== null
      ? high - low
      : low >= PLACEMENT_TOP_RUNG
        ? PLACEMENT_RUNG_STEP
        : PLACEMENT_TOP_RUNG - low;
  const decidingMiss = high === null ? null : history.find((result) => result.rung === high) ?? null;

  return {
    floor: Math.min(low + 1, PLACEMENT_TOP_RUNG),
    lastPassedRung: low,
    firstMissedRung: high,
    bracketWidth,
    confidence: placementConfidence({ bracketWidth, decidingMiss }),
    probes: history.length,
  };
}

/**
 * The next probe, or the verdict.
 *
 * The whole staircase is this function: it holds no state of its own, so a
 * probe issued from a signed ticket and a probe replayed in a test walk the
 * identical path.
 */
export function nextPlacementStep(history: readonly PlacementProbeResult[]): PlacementStep {
  const { low, high, passes, bisections } = readBracket(history);

  const finish = (): PlacementStep => ({ done: true, verdict: placementVerdict(history) });

  if (history.length >= PLACEMENT_MAX_PROBES) return finish();

  /* Still climbing: nothing has been missed, so the question is how much
     further to jump. */
  if (high === null) {
    const rung = nextMilestoneAbove(low);
    if (rung === null) return finish();
    return { done: false, probe: { rung, choiceCount: nextChoiceCount(passes), ...placementBlock(rung) } };
  }

  /* One rung of doubt is as close as five-level granularity gets. */
  if (high - low <= PLACEMENT_RUNG_STEP) return finish();
  if (bisections >= PLACEMENT_MAX_BISECTIONS) return finish();

  const rung = bisectRung(low, high);
  return { done: false, probe: { rung, choiceCount: nextChoiceCount(passes), ...placementBlock(rung) } };
}
