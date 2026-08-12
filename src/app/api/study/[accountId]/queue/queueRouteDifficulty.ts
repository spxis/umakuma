import { z } from "zod";

import { QUEUE_TYPES, type QueueType } from "@/lib/domainConstants";
import {
  REVIEW_DIFFICULTY_SORTS,
  sortReviewsByDifficulty,
  type ReviewDifficultySort,
  type ReviewPerformance,
} from "@/lib/reviewDifficulty";
import { fetchReviewPerformance } from "@/lib/reviewSuccessRates";
import type { AssignmentData, SubjectData } from "./queueRouteUtils";

type QueueRow = {
  assignmentId: number;
  data: AssignmentData;
  queueType: QueueType;
};

const difficultySortSchema = z.enum([
  REVIEW_DIFFICULTY_SORTS.easiest,
  REVIEW_DIFFICULTY_SORTS.hardest,
]).optional();

export function parseReviewDifficultySort(value: string | null) {
  return difficultySortSchema.safeParse(value ?? undefined);
}

function sortDefaultQueueRows(
  rows: QueueRow[],
  subjectById: Map<number, { object: string; data: SubjectData }>,
): QueueRow[] {
  return [...rows].sort((a, b) => {
    const aReview = a.queueType === QUEUE_TYPES.review ? 0 : 1;
    const bReview = b.queueType === QUEUE_TYPES.review ? 0 : 1;
    if (aReview !== bReview) {
      return aReview - bReview;
    }

    const aLevel = subjectById.get(a.data.subject_id)?.data.level ?? 999;
    const bLevel = subjectById.get(b.data.subject_id)?.data.level ?? 999;
    if (aLevel !== bLevel) {
      return aLevel - bLevel;
    }

    return a.data.subject_id - b.data.subject_id;
  });
}

export async function sortQueueRows(params: {
  accountId: string;
  rows: QueueRow[];
  subjectById: Map<number, { object: string; data: SubjectData }>;
  difficultySort?: ReviewDifficultySort;
}): Promise<{
  sortedRows: QueueRow[];
  performanceBySubjectId: Map<number, ReviewPerformance>;
}> {
  const defaultSortedRows = sortDefaultQueueRows(params.rows, params.subjectById);
  if (!params.difficultySort) {
    return { sortedRows: defaultSortedRows, performanceBySubjectId: new Map() };
  }

  const performanceBySubjectId = await fetchReviewPerformance(
    params.accountId,
    params.rows.map((row) => row.data.subject_id),
  );
  const sortedRows = sortReviewsByDifficulty(
    defaultSortedRows.map((row) => ({
      ...row,
      subjectId: row.data.subject_id,
      srsStage: row.data.srs_stage,
      wkLevel: params.subjectById.get(row.data.subject_id)?.data.level,
      passedAt: row.data.passed_at,
      performance: performanceBySubjectId.get(row.data.subject_id),
    })),
    params.difficultySort,
  );

  return { sortedRows, performanceBySubjectId };
}