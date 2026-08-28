import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  buildGameQuestions,
  buildGameQuestionsFromTargets,
  buildShiritoriQuestion,
  shiritoriChainKeyAfter,
  shiritoriOpeningKeys,
  type GameCatalogItem,
} from "@/lib/gameModeServer";
import { seededRandom } from "@/lib/gameRandom";

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

function vocabItem(subjectId: number, characters: string, reading: string): GameCatalogItem {
  return {
    ...gameItem(subjectId),
    subjectType: "vocabulary",
    characters,
    primaryReading: reading,
    readings: [reading],
  };
}

describe("buildGameQuestionsFromTargets", () => {
  it("asks only about the given targets while drawing distractors from the pool", () => {
    const pool = Array.from({ length: 20 }, (_, index) => gameItem(index + 1));
    const targets = pool.slice(0, 4);
    const questions = buildGameQuestionsFromTargets(targets, pool);

    expect(questions.map((question) => question.targetSubjectId)).toEqual([1, 2, 3, 4]);
    for (const question of questions) {
      expect(question.leftSubjectId).not.toBe(question.rightSubjectId);
    }
  });

  it("rejects an empty target list", () => {
    expect(() => buildGameQuestionsFromTargets([], [gameItem(1), gameItem(2)])).toThrow(
      "At least 2 eligible items are required.",
    );
  });
});

describe("seeded question building", () => {
  it("produces the identical set for the same seed and a different one otherwise", () => {
    const pool = Array.from({ length: 40 }, (_, index) => gameItem(index + 1));
    const first = buildGameQuestions(pool, 10, false, seededRandom("2026-08-28"));
    const second = buildGameQuestions(pool, 10, false, seededRandom("2026-08-28"));
    const other = buildGameQuestions(pool, 10, false, seededRandom("2026-08-29"));

    expect(second).toEqual(first);
    expect(other).not.toEqual(first);
  });
});

describe("buildShiritoriQuestion", () => {
  const pool = [
    vocabItem(1, "車", "くるま"),
    vocabItem(2, "まいにち", "まいにち"),
    vocabItem(3, "学校", "がっこう"),
    vocabItem(4, "先生", "せんせい"),
    vocabItem(5, "日本", "にほん"),
    vocabItem(6, "桜", "さくら"),
  ];

  it("offers exactly one word that continues the chain", () => {
    const question = buildShiritoriQuestion({
      pool,
      chainKey: "ま",
      position: 3,
      usedSubjectIds: new Set([1]),
      previousItem: pool[0]!,
      hardMode: false,
      random: seededRandom("chain"),
    });

    expect(question).not.toBeNull();
    expect(question!.targetSubjectId).toBe(2);
    expect(question!.answerType).toBe("chain");
    expect(question!.position).toBe(3);
    expect(question!.promptOverride).toBe("車 くるま → ま");
  });

  it("prefers a word that leaves the chain alive over one that dead-ends", () => {
    // かめ ends on め and nothing starts with め; かさ ends on さ and さくら does.
    const lookaheadPool = [
      vocabItem(10, "亀", "かめ"),
      vocabItem(11, "傘", "かさ"),
      vocabItem(12, "桜", "さくら"),
    ];

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const question = buildShiritoriQuestion({
        pool: lookaheadPool,
        chainKey: "か",
        position: 0,
        usedSubjectIds: new Set(),
        previousItem: null,
        hardMode: false,
        random: seededRandom(`lookahead-${attempt}`),
      });
      expect(question!.targetSubjectId).toBe(11);
    }
  });

  it("falls back to a dead-end word when nothing else continues", () => {
    const deadEndPool = [vocabItem(20, "亀", "かめ"), vocabItem(21, "桜", "さくら")];
    const question = buildShiritoriQuestion({
      pool: deadEndPool,
      chainKey: "か",
      position: 0,
      usedSubjectIds: new Set(),
      previousItem: null,
      hardMode: false,
      random: seededRandom("dead-end"),
    });

    expect(question!.targetSubjectId).toBe(20);
  });

  it("returns null when no unused word continues the chain", () => {
    expect(
      buildShiritoriQuestion({
        pool,
        chainKey: "ま",
        position: 1,
        usedSubjectIds: new Set([2]),
        previousItem: pool[0]!,
        hardMode: false,
        random: seededRandom("chain"),
      }),
    ).toBeNull();
  });

  it("never chains onto a word whose reading ends in ん", () => {
    expect(shiritoriChainKeyAfter(pool[4]!)).toBeNull();
    expect(shiritoriChainKeyAfter(pool[0]!)).toBe("ま");
    expect(shiritoriOpeningKeys(pool)).not.toContain("に");
  });
});
