import type { StudyQueueItem } from "./studyExplorerTypes";

export function nextReviewSessionItem(
  items: StudyQueueItem[],
  submittedAssignmentId: number,
): StudyQueueItem | null {
  const submittedIndex = items.findIndex((item) => item.assignmentId === submittedAssignmentId);
  if (submittedIndex < 0) {
    return null;
  }

  return items[submittedIndex + 1] ?? items[submittedIndex - 1] ?? items[submittedIndex] ?? null;
}
