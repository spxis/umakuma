import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildGameQuestions, type GameCatalogItem } from "@/lib/gameModeServer";

function gameItem(subjectId: number): GameCatalogItem {
  return {
    assignmentId: subjectId,
    subjectId,
    subjectType: "kanji",
    level: subjectId,
    srsStage: 1,
    startedAt: "2026-01-01T00:00:00.000Z",
    characters: String(subjectId),
    primaryMeaning: `Meaning ${subjectId}`,
    primaryReading: `reading-${subjectId}`,
    readings: [`reading-${subjectId}`],
    componentSubjectIds: [],
    visuallySimilarSubjectIds: [],
  };
}

describe("buildGameQuestions", () => {
  it("uses distinct choices and balances correct-answer sides", () => {
    const questions = buildGameQuestions(Array.from({ length: 10 }, (_, index) => gameItem(index + 1)), 5);
    const subjectIds = questions.flatMap((question) => [question.leftSubjectId, question.rightSubjectId]);
    const leftTargets = questions.filter((question) => question.leftSubjectId === question.targetSubjectId);

    expect(new Set(subjectIds).size).toBe(10);
    expect(leftTargets).toHaveLength(3);
  });

  it("falls back to the target pool when no separate distractors exist", () => {
    const questions = buildGameQuestions(Array.from({ length: 5 }, (_, index) => gameItem(index + 1)), 5);

    expect(questions).toHaveLength(5);
    expect(new Set(questions.map((question) => question.targetSubjectId)).size).toBe(5);
  });

  it("uses every eligible item for an all-items round", () => {
    const pool = Array.from({ length: 7 }, (_, index) => gameItem(index + 1));
    const questions = buildGameQuestions(pool, pool.length);

    expect(questions).toHaveLength(pool.length);
    expect(new Set(questions.map((question) => question.targetSubjectId))).toEqual(
      new Set(pool.map((item) => item.subjectId)),
    );
  });

  it("rejects an all-items pool without two choices", () => {
    expect(() => buildGameQuestions([gameItem(1)], 1)).toThrow("At least 2 eligible items are required.");
  });

  it("builds hard-mode questions with three distinct choices", () => {
    const questions = buildGameQuestions(Array.from({ length: 12 }, (_, index) => gameItem(index + 1)), 6, true);

    expect(questions).toHaveLength(6);
    for (const question of questions) {
      expect(question.middleSubjectId).not.toBeNull();
      expect(new Set([question.leftSubjectId, question.middleSubjectId, question.rightSubjectId]).size).toBe(3);
    }

    const targetPositions = questions.map((question) =>
      [question.leftSubjectId, question.middleSubjectId, question.rightSubjectId].indexOf(question.targetSubjectId),
    );
    expect(targetPositions.filter((position) => position === 0)).toHaveLength(2);
    expect(targetPositions.filter((position) => position === 1)).toHaveLength(2);
    expect(targetPositions.filter((position) => position === 2)).toHaveLength(2);
  });

  it("requires three eligible items for hard mode", () => {
    expect(() => buildGameQuestions([gameItem(1), gameItem(2)], 2, true)).toThrow("At least 3 eligible items are required.");
  });
});
