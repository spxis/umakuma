import { describe, expect, it } from "vitest";

import { XP_BONUSES, XP_DAILY_CAPS } from "./xpAwards";
import { gameXpAwards, XP_FLAWLESS_GAME_MIN_QUESTIONS, type FinishedGame } from "./xpGameAwards";

const kinds = (awards: { kind: string }[]) => awards.map((award) => award.kind);

const game = (over: Partial<FinishedGame> = {}): FinishedGame => ({
  label: "Match",
  questionCount: 10,
  correctCount: 7,
  score: 1_000,
  previousBest: 2_000,
  clearedMap: null,
  ...over,
});

/**
 * What a finished game earns, decided without a database.
 *
 * Three of these went unpaid site-wide from the day they were priced, because
 * the request list was a constant: a game asked for `gameFinished` and could
 * not notice it had been perfect. So the cases worth pinning are the ones
 * where an award must *not* fire — a first run has no best to beat, a
 * two-question round is not a flawless game — since those are what a constant
 * gets right by accident and a rule can get wrong.
 */
describe("what a finished game earns", () => {
  it("always pays for finishing, whatever else it did", () => {
    expect(kinds(gameXpAwards(game()))).toEqual(["gameFinished"]);
  });

  it("pays the flawless bonus for a round with every answer right", () => {
    expect(kinds(gameXpAwards(game({ questionCount: 10, correctCount: 10 })))).toContain("flawlessGame");
  });

  it("does not pay flawless for a round too short to be one", () => {
    const short = XP_FLAWLESS_GAME_MIN_QUESTIONS - 1;
    const awards = gameXpAwards(game({ questionCount: short, correctCount: short }));
    expect(kinds(awards)).not.toContain("flawlessGame");
  });

  it("does not pay flawless when a single answer was wrong", () => {
    expect(kinds(gameXpAwards(game({ questionCount: 10, correctCount: 9 })))).not.toContain("flawlessGame");
  });

  it("pays a personal best only for a score past the one already held", () => {
    expect(kinds(gameXpAwards(game({ score: 2_001, previousBest: 2_000 })))).toContain("personalBest");
    expect(kinds(gameXpAwards(game({ score: 2_000, previousBest: 2_000 })))).not.toContain("personalBest");
  });

  /* The one that would have paid 350 XP for playing each game once. */
  it("does not pay a personal best when there is no earlier run to beat", () => {
    expect(kinds(gameXpAwards(game({ score: 9_999, previousBest: null })))).not.toContain("personalBest");
  });

  it("pays the map bonus only when a country was covered", () => {
    expect(kinds(gameXpAwards(game()))).not.toContain("mapCleared");
    const cleared = gameXpAwards(game({ clearedMap: { label: "Japan", regionCount: 47 } }));
    expect(kinds(cleared)).toContain("mapCleared");
  });

  it("names what each award was for, so the history is not a column of repeats", () => {
    const awards = gameXpAwards(
      game({
        label: "Map",
        questionCount: 47,
        correctCount: 47,
        score: 12_500,
        previousBest: 9_000,
        clearedMap: { label: "Japan", regionCount: 47 },
      }),
    );
    const notes = Object.fromEntries(awards.map((award) => [award.kind, award.note]));
    expect(notes.flawlessGame).toBe("Map: 47 out of 47.");
    expect(notes.personalBest).toBe("Map: 12,500, past your 9,000.");
    expect(notes.mapCleared).toBe("Japan: all 47.");
  });
});

/**
 * The prices and ceilings, pinned where the reasoning for them lives.
 *
 * A personal best cannot be repeated without being beaten, so it needs no
 * ceiling; the other two are repeatable at the player's convenience and carry
 * one of a single award a day. Losing either cap would make a five-question
 * round the best-paid minute on the site.
 */
describe("how often a game bonus may be earned", () => {
  it("caps the two that can be repeated at one a day", () => {
    expect(XP_DAILY_CAPS.flawlessGame).toBe(XP_BONUSES.flawlessGame);
    expect(XP_DAILY_CAPS.mapCleared).toBe(XP_BONUSES.mapCleared);
  });

  it("leaves a personal best uncapped, because beating yourself is its own limit", () => {
    expect(XP_DAILY_CAPS.personalBest).toBeUndefined();
  });
});
