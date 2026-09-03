import { describe, expect, it } from "vitest";

import {
  LIST_STANDINGS,
  byProgress,
  memberStandings,
  standingFor,
  worthShowing,
  type StandingFacts,
} from "./listProgress";

describe("where one member stands on one subject", () => {
  /*
   * Guru is the line WaniKani itself draws: answered right across days rather
   * than minutes, and what unlocks the next thing.
   */
  it("calls Guru and above known", () => {
    for (const srsStage of [5, 6, 7, 8, 9]) {
      expect(standingFor({ srsStage, unlocked: true })).toBe(LIST_STANDINGS.known);
    }
  });

  it("calls Apprentice learning, which is neither yes nor not yet", () => {
    for (const srsStage of [1, 2, 3, 4]) {
      expect(standingFor({ srsStage, unlocked: true })).toBe(LIST_STANDINGS.learning);
    }
  });

  it("calls a locked or unstarted subject not started", () => {
    expect(standingFor(undefined)).toBe(LIST_STANDINGS.none);
    expect(standingFor({ srsStage: 0, unlocked: true })).toBe(LIST_STANDINGS.none);
    /* Unlocking is what a level-up does; it is not the member having done anything. */
    expect(standingFor({ srsStage: 3, unlocked: false })).toBe(LIST_STANDINGS.none);
  });
});

describe("a member across the list", () => {
  const facts: Record<number, StandingFacts> = {
    1: { srsStage: 6, unlocked: true },
    2: { srsStage: 2, unlocked: true },
    3: undefined,
    4: { srsStage: 9, unlocked: true },
  };
  const standings = memberStandings({ accountId: "a", name: "Mika" }, [1, 2, 3, 4], (id) => facts[id]);

  it("counts each standing", () => {
    expect(standings.counts).toEqual({ known: 2, learning: 1, none: 1 });
  });

  it("reports the share known, which is what the row is sorted by", () => {
    expect(standings.known).toBe(0.5);
  });

  /* An empty list is nobody's fault; it must not divide by zero. */
  it("is zero across no items rather than NaN", () => {
    expect(memberStandings({ accountId: "a", name: "Mika" }, [], () => undefined).known).toBe(0);
  });
});

describe("reading the members in order", () => {
  const at = (name: string, known: number) => ({ accountId: name, name, counts: { known: 0, learning: 0, none: 0 }, known });

  /* Furthest along first, so "who needs a hand" is at the end where it is easy to find. */
  it("puts the furthest along first and breaks ties on the name", () => {
    const ordered = byProgress([at("Sam", 0.2), at("Ana", 0.9), at("Bo", 0.9)]);
    expect(ordered.map((row) => row.name)).toEqual(["Ana", "Bo", "Sam"]);
  });

  it("does not disturb what it was given", () => {
    const rows = [at("Sam", 0.2), at("Ana", 0.9)];
    byProgress(rows);
    expect(rows.map((row) => row.name)).toEqual(["Sam", "Ana"]);
  });
});

describe("whether the overlay is worth drawing", () => {
  const one = { accountId: "a", name: "A", counts: { known: 0, learning: 0, none: 0 }, known: 0 };

  /* One member is not a comparison - it is the reader's own progress, which the cards already show. */
  it("wants more than one member", () => {
    expect(worthShowing([one], 5)).toBe(false);
    expect(worthShowing([one, { ...one, accountId: "b", name: "B" }], 5)).toBe(true);
  });

  /* A list of words WaniKani never taught has nothing anybody can be marked up for. */
  it("wants something the catalogue names", () => {
    expect(worthShowing([one, { ...one, accountId: "b", name: "B" }], 0)).toBe(false);
  });
});
