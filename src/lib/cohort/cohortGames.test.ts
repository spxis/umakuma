import { describe, expect, it } from "vitest";

import { GAME_KINDS } from "@/lib/gameMode";
import { seededRandom } from "@/lib/gameRandom";

import { chooseGame, gamesToday, playRun, type PlannedQuestion } from "./cohortGames";
import { derivePersona } from "./cohortPersona";

const JOINED = new Date("2026-08-01T12:00:00Z");
const persona = (slug: string) => derivePersona({ slug, displayName: slug, country: "US", joinedAt: JOINED });

function questions(count: number, choices = 4): PlannedQuestion[] {
  return Array.from({ length: count }, (_, position) => {
    const options = Array.from({ length: choices }, (_, i) => 1_000 + position * 10 + i);
    return {
      position,
      targetSubjectId: options[position % choices]!,
      optionSubjectIds: options,
      leftSubjectId: options[0]!,
      middleSubjectId: options[1] ?? null,
      rightSubjectId: options[options.length - 1]!,
    };
  });
}

describe("playRun", () => {
  it("answers every question of a fixed round with a real tile, and counts what it got right", () => {
    const played = playRun({
      persona: persona("player"), questions: questions(10), choiceCount: 4, timeLimitMs: null,
      startedAt: new Date("2026-09-01T10:00:00Z"), random: seededRandom("round"),
    });
    expect(played.answeredCount).toBe(10);
    expect(played.answers.map((a) => a.position)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (const answer of played.answers) {
      const question = questions(10)[answer.position]!;
      expect(question.optionSubjectIds).toContain(answer.selectedSubjectId);
      expect(answer.correct).toBe(answer.selectedSubjectId === question.targetSubjectId);
    }
    expect(played.correctCount).toBe(played.answers.filter((a) => a.correct).length);
    expect(played.bestStreak).toBeLessThanOrEqual(played.correctCount);
    expect(played.completedAt.getTime()).toBeGreaterThan(new Date("2026-09-01T10:00:00Z").getTime());
    expect(played.accumulatedScore).toBe(0);
  });

  it("stops a timed round at the clock and records the limit as its length", () => {
    const startedAt = new Date("2026-09-01T10:00:00Z");
    const played = playRun({
      persona: persona("sprinter"), questions: questions(25), choiceCount: 2, timeLimitMs: 30_000,
      startedAt, random: seededRandom("sprint"),
    });
    expect(played.answeredCount).toBeLessThan(25);
    expect(played.answeredCount).toBeGreaterThan(3);
    expect(played.completedAt.getTime() - startedAt.getTime()).toBe(30_000);
    expect(played.accumulatedScore).toBeGreaterThan(0);
    for (const answer of played.answers) expect(answer.answeredAt.getTime() - startedAt.getTime()).toBeLessThanOrEqual(30_000);
  });

  it("is deterministic for the same random source", () => {
    const play = () => playRun({
      persona: persona("twice"), questions: questions(12), choiceCount: 3, timeLimitMs: null,
      startedAt: new Date("2026-09-01T10:00:00Z"), random: seededRandom("same"),
    });
    expect(play()).toEqual(play());
  });

  it("gets more right on two tiles than on four", () => {
    const score = (choices: number) => {
      let correct = 0;
      for (let round = 0; round < 40; round += 1) {
        correct += playRun({
          persona: persona("tiles"), questions: questions(10, choices), choiceCount: choices, timeLimitMs: null,
          startedAt: new Date("2026-09-01T10:00:00Z"), random: seededRandom(`t-${choices}-${round}`),
        }).correctCount;
      }
      return correct;
    };
    expect(score(2)).toBeGreaterThan(score(4));
  });
});

describe("gamesToday and chooseGame", () => {
  it("plays a few games on some days and none on others, never more than four", () => {
    const counts = Array.from({ length: 200 }, (_, i) => gamesToday(persona("gamer"), seededRandom(`g-${i}`)));
    expect(Math.max(...counts)).toBeLessThanOrEqual(4);
    expect(counts.some((c) => c === 0)).toBe(true);
    expect(counts.some((c) => c >= 1)).toBe(true);
  });

  it("only offers the Daily Challenge when it is available, and plays every kind over time", () => {
    const kinds = new Set<string>();
    for (let i = 0; i < 200; i += 1) {
      const request = chooseGame({ persona: persona("variety"), level: 12, dailyAvailable: i % 2 === 0, random: seededRandom(`c-${i}`) });
      kinds.add(request.kind);
      if (i % 2 === 1) expect(request.kind).not.toBe(GAME_KINDS.daily);
      if (request.level !== null) expect(request.level).toBeLessThanOrEqual(12);
      if (request.kind === GAME_KINDS.timeAttack) expect(request.timeLimitMs).not.toBeNull();
      if (request.kind === GAME_KINDS.match) expect(request.ladder).toBe("umakuma");
    }
    expect(kinds).toEqual(new Set([GAME_KINDS.daily, GAME_KINDS.match, GAME_KINDS.map, GAME_KINDS.timeAttack]));
  });
});
