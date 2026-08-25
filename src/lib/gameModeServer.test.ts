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
});
