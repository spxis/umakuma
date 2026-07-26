import { prisma } from "@/lib/prisma";

type SubjectWithId = {
  subjectId?: unknown;
  radicals?: unknown;
  visuallySimilar?: unknown;
  usedInVocabulary?: unknown;
  componentKanji?: unknown;
};

const RELATION_KEYS = [
  "radicals",
  "visuallySimilar",
  "usedInVocabulary",
  "componentKanji",
] as const;

export function calculateReviewSuccessRates(
  attempts: Array<{ subjectId: number; result: "correct" | "wrong" }>,
): Map<number, number> {
  const totalsBySubjectId = new Map<number, { correct: number; total: number }>();
  for (const attempt of attempts) {
    const totals = totalsBySubjectId.get(attempt.subjectId) ?? { correct: 0, total: 0 };
    totals.total += 1;
    if (attempt.result === "correct") {
      totals.correct += 1;
    }
    totalsBySubjectId.set(attempt.subjectId, totals);
  }

  return new Map(
    Array.from(totalsBySubjectId, ([subjectId, totals]) => [
      subjectId,
      Math.round((totals.correct / totals.total) * 100),
    ]),
  );
}

function collectSubjects(items: SubjectWithId[]): SubjectWithId[] {
  return items.flatMap((item) => [
    item,
    ...RELATION_KEYS.flatMap((key) =>
      Array.isArray(item[key]) ? (item[key] as SubjectWithId[]) : [],
    ),
  ]);
}

export async function withReviewSuccessRates<T extends SubjectWithId>(
  accountId: string,
  items: T[],
): Promise<Array<T & { successRate?: number }>> {
  const subjectIds = Array.from(
    new Set(
      collectSubjects(items)
        .map((item) => item.subjectId)
        .filter((subjectId): subjectId is number =>
          typeof subjectId === "number" && Number.isInteger(subjectId) && subjectId > 0,
        ),
    ),
  );

  if (subjectIds.length === 0) {
    return items;
  }

  const attempts = await prisma.studyReviewAttempt.findMany({
    where: {
      accountId,
      subjectId: { in: subjectIds },
      result: { in: ["correct", "wrong"] },
    },
    select: { subjectId: true, result: true },
  });

  const successRateBySubjectId = calculateReviewSuccessRates(
    attempts.filter(
      (attempt): attempt is { subjectId: number; result: "correct" | "wrong" } =>
        attempt.result === "correct" || attempt.result === "wrong",
    ),
  );

  const addSuccessRate = <U extends SubjectWithId>(item: U): U & { successRate?: number } => {
    if (typeof item.subjectId !== "number") {
      return item;
    }

    const successRate = successRateBySubjectId.get(item.subjectId);
    if (typeof successRate !== "number") {
      return item;
    }

    return {
      ...item,
      successRate,
    };
  };

  return items.map((item) => ({
    ...addSuccessRate(item),
    ...Object.fromEntries(
      RELATION_KEYS.flatMap((key) =>
        Array.isArray(item[key])
          ? [[key, (item[key] as SubjectWithId[]).map(addSuccessRate)]]
          : [],
      ),
    ),
  }));
}
