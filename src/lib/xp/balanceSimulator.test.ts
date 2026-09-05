import { describe, expect, it } from "vitest";

import { KANJI_LADDER_LEVELS } from "@/lib/kanjiLadder";

import { applyOverrides, runBalanceSimulation, simulatePersona, sittingsComparison } from "./balanceSimulator";
import { SIM_PERSONAS, simPersonaById } from "./simPersonas";
import { expectedReviews } from "./simSchedule";
import { splitTotal } from "./simEconomy";

const SEEDS = [1, 7, 13, 29, 41, 57, 73, 91];
const reference = () => simPersonaById("morning-and-night")!;
const mean = (values: number[]) => values.reduce((total, value) => total + value, 0) / values.length;

describe("simulatePersona", () => {
  it("is reproducible, so two runs can be compared at all", () => {
    const first = simulatePersona(reference(), { days: 200, seed: 3 });
    const second = simulatePersona(reference(), { days: 200, seed: 3 });
    expect(second.xp).toBe(first.xp);
    expect(second.curriculumLevel).toBe(first.curriculumLevel);
    expect(second.reviewsAnswered).toBe(first.reviewsAnswered);
  });

  it("answers wrong about as often as its accuracy says it will", () => {
    const result = simulatePersona({ ...reference(), accuracy: 0.75 }, { days: 400, seed: 9 });
    expect(result.wrongShare).toBeGreaterThan(0.2);
    expect(result.wrongShare).toBeLessThan(0.3);
    expect(result.wrongAnswers).toBeLessThan(result.reviewsAnswered);
  });

  it("keeps items past Guru until they burn, which is most of the review load", () => {
    const result = simulatePersona(reference(), { days: 730, seed: 5 });
    expect(result.itemsBurned).toBeGreaterThan(0);
    expect(result.itemsPassed).toBeGreaterThan(result.itemsBurned);
    /* Deleting an item at Guru halved this and had a forty-five-review-a-day
       learner finishing all nine thousand items inside three years. */
    expect(result.reviewsAnswered / result.itemsLearned).toBeGreaterThan(expectedReviews(0.85) * 0.6);
  });

  it("does not let a modest learner finish the whole curriculum in a year", () => {
    const result = simulatePersona(reference(), { days: 365, seed: 5 });
    expect(result.curriculumLevel).toBeLessThan(40);
    expect(result.itemsLearned).toBeLessThan(3_000);
  });

  it("never takes a cleared level back, however badly the day goes", () => {
    const before = simulatePersona({ ...reference(), accuracy: 0.5 }, { days: 300, seed: 4 });
    const after = simulatePersona({ ...reference(), accuracy: 0.5 }, { days: 600, seed: 4 });
    expect(after.curriculumLevel).toBeGreaterThanOrEqual(before.curriculumLevel);
    expect(after.itemsPassed).toBeGreaterThanOrEqual(before.itemsPassed);
  });

  it("splits XP by source, and the parts add up to the whole", () => {
    const result = simulatePersona(reference(), { days: 365, seed: 5 });
    expect(splitTotal(result.xpSplit)).toBe(result.xp);
    for (const source of Object.values(result.xpSplit)) expect(source).toBeGreaterThan(0);
  });

  it("records the day each level was reached, which is what pacing questions want", () => {
    const result = simulatePersona(reference(), { days: 730, seed: 5 });
    expect(result.levelDays[1]).not.toBeNull();
    const tenth = result.levelDays[10];
    const twentieth = result.levelDays[20];
    expect(tenth).not.toBeNull();
    expect(twentieth).not.toBeNull();
    expect(twentieth!).toBeGreaterThan(tenth!);
    expect(result.levelDays[KANJI_LADDER_LEVELS]).toBeNull();
  });

  it("starts an imported member at their level, and at no XP", () => {
    const importer = simPersonaById("wanikani-import-17")!;
    expect(importer.startLevel).toBe(20);
    expect(importer.startXp).toBe(0);
    const day = simulatePersona(importer, { days: 1, seed: 5 });
    expect(day.curriculumLevel).toBeGreaterThanOrEqual(20);
    expect(day.xpRank).toBeLessThan(10);
  });

  it("spends a rest day rather than a streak, until the year's allowance is gone", () => {
    const result = simulatePersona({ ...reference(), attendance: 0.7 }, { days: 365, seed: 8 });
    expect(result.restDaysSpent).toBeGreaterThan(0);
    expect(result.restDaysSpent).toBeLessThanOrEqual(result.days);
    expect(result.longestStreak).toBeGreaterThan(0);
  });

  /**
   * The gate is a latch, the way `resolveUkLevel` is: `passedAt` is stamped the
   * first time an item reaches Guru and never cleared. It matters more than it
   * looks. Modelled as a census — kanji *currently* at Guru — a 60% learner
   * never clears a level at all, which is a phase transition rather than a
   * slowdown. Latching, they clear one every nineteen days.
   */
  it("clears levels at every accuracy, because the gate latches", () => {
    const ample = { ...reference(), attendance: 1, holidayDays: 0, reviewsPerDay: 400, lessonsPerDay: 60 };
    const reached = [0.8, 0.7, 0.6, 0.5].map(
      (accuracy) => simulatePersona({ ...ample, accuracy }, { days: 400, seed: 5 }).curriculumLevel,
    );
    /* Worse accuracy is slower and only slower, at every step down. */
    for (const level of reached) expect(level).toBeGreaterThan(10);
    for (let at = 1; at < reached.length; at += 1) expect(reached[at]).toBeLessThan(reached[at - 1]);
    const [sharp] = reached;
    const struggling = reached[2];
    /* A tax, not a wall: about twice as slow, not infinitely slow. */
    expect(struggling).toBeGreaterThan(sharp / 3);
  });

  it("keeps an item counted after it falls back out of Guru", () => {
    const clumsy = simulatePersona({ ...reference(), accuracy: 0.55 }, { days: 500, seed: 4 });
    /* Almost everything they have learned has passed at some point, even at an
       accuracy where very little of it is sitting at Guru right now. */
    expect(clumsy.itemsPassed / clumsy.itemsLearned).toBeGreaterThan(0.8);
    expect(clumsy.itemsPassed).toBeGreaterThan(clumsy.itemsBurned);
  });

  it("lets a lesson gate hold the queue down when one is asked for", () => {
    const greedy = { ...reference(), lessonsPerDay: 40, startLevel: 60 };
    const ungated = simulatePersona(greedy, { days: 365, seed: 6 });
    const gated = simulatePersona(greedy, { days: 365, seed: 6, lessonGate: 60 });
    expect(gated.backlog).toBeLessThanOrEqual(ungated.backlog);
    expect(gated.lessonsStarted).toBeLessThan(ungated.lessonsStarted);
  });
});

describe("throttling lessons on the backlog", () => {
  /**
   * Anki's default, and the load control nothing here has: new cards come out
   * of the same daily limit as reviews, so being behind pauses introduction by
   * itself. Over the whole persona set it takes the average backlog from about
   * seventy-four items to about eleven and costs a third of a level in fifty —
   * which is the argument for shipping it.
   */
  it("clears the backlog for almost nothing", () => {
    const seeds = [1, 5, 11, 23];
    const off = seeds.map((seed) => simulatePersona(reference(), { days: 1095, seed }));
    const on = seeds.map((seed) =>
      simulatePersona(reference(), { days: 1095, seed, throttleLessonsOnBacklog: true }),
    );
    expect(mean(on.map((row) => row.backlog))).toBeLessThan(mean(off.map((row) => row.backlog)) / 2);
    expect(mean(on.map((row) => row.curriculumLevel))).toBeGreaterThan(
      mean(off.map((row) => row.curriculumLevel)) * 0.9,
    );
  });

  it("holds no lessons at all from somebody who is never behind", () => {
    const easy = { ...reference(), lessonsPerDay: 2, reviewsPerDay: 400 };
    const off = simulatePersona(easy, { days: 365, seed: 5 });
    const on = simulatePersona(easy, { days: 365, seed: 5, throttleLessonsOnBacklog: true });
    expect(on.lessonsStarted).toBe(off.lessonsStarted);
  });
});

describe("sitting down more often", () => {
  /**
   * The question the whole thing was built for, and the invariant that broke
   * before: served in learn order, a third sitting spent its budget
   * re-answering four-hour items while a week-old backlog waited, and more
   * sittings scored worse. Averaged over seeds because one run's luck is worth
   * about a level either way.
   */
  it("is never worse, and is worth most in the first months", () => {
    const early = SEEDS.map((seed) => sittingsComparison(reference(), { days: 90, seed }, [1, 2]));
    const once = mean(early.map((row) => row[0].curriculumLevel));
    const twice = mean(early.map((row) => row[1].curriculumLevel));
    expect(twice).toBeGreaterThan(once);
    expect(twice - once).toBeGreaterThan(0.5);
  });

  it("stops mattering once the review budget is what binds, not the schedule", () => {
    /* The honest finding. At a realistic budget the queue always has something
       due, so the schedule cannot decide anything and only capacity counts. */
    const tight = SEEDS.map((seed) => sittingsComparison(reference(), { days: 1095, seed }, [1, 2]));
    const gapTight = mean(tight.map((row) => row[1].curriculumLevel - row[0].curriculumLevel));
    const loose = SEEDS.map((seed) =>
      sittingsComparison({ ...reference(), reviewsPerDay: 500 }, { days: 1095, seed }, [1, 2]),
    );
    const gapLoose = mean(loose.map((row) => row[1].curriculumLevel - row[0].curriculumLevel));
    expect(gapLoose).toBeGreaterThan(gapTight * 5);
  });

  it("gains almost nothing from a fourth sitting, because the schedule will not allow it", () => {
    /* Only stages 1 and 2 come back inside a day. Everything above waits 23
       hours or more, so sittings past the second have nothing left to catch. */
    const rows = SEEDS.map((seed) =>
      sittingsComparison({ ...reference(), reviewsPerDay: 500 }, { days: 365, seed }, [2, 4]),
    );
    const twice = mean(rows.map((row) => row[0].curriculumLevel));
    const fourTimes = mean(rows.map((row) => row[1].curriculumLevel));
    expect(fourTimes).toBeGreaterThanOrEqual(twice);
    expect(fourTimes - twice).toBeLessThan(twice * 0.12);
  });
});

describe("the persona set", () => {
  it("moves everybody somewhere in a year, and nobody all the way", () => {
    const results = runBalanceSimulation(SIM_PERSONAS, { days: 365 });
    expect(results).toHaveLength(SIM_PERSONAS.length);
    for (const result of results) {
      expect(result.xpRank).toBeGreaterThan(1);
      expect(result.reviewsAnswered).toBeGreaterThan(0);
    }
    const fromScratch = results.filter((result) => result.persona.startLevel === 1);
    expect(fromScratch.every((result) => result.curriculumLevel < KANJI_LADDER_LEVELS)).toBe(true);
  });

  it("has unique ids, so a table row can be pointed at", () => {
    expect(new Set(SIM_PERSONAS.map((persona) => persona.id)).size).toBe(SIM_PERSONAS.length);
  });
});

describe("applyOverrides", () => {
  it("moves one field and sorts the sittings, leaving the rest alone", () => {
    const moved = applyOverrides(reference(), { accuracy: 0.5, sessionHours: [21, 7] });
    expect(moved.accuracy).toBe(0.5);
    expect(moved.sessionHours).toEqual([7, 21]);
    expect(moved.reviewsPerDay).toBe(reference().reviewsPerDay);
  });

  it("hands back the persona untouched when nothing is overridden", () => {
    expect(applyOverrides(reference())).toBe(reference());
  });
});
