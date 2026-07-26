import { describe, expect, it } from "vitest";
import type { StudyQueueItem } from "./studyExplorerTypes";
import { nextReviewSessionItem } from "./reviewSessionNavigation";

function item(assignmentId: number, subjectId: number): StudyQueueItem {
  return { assignmentId, subjectId } as StudyQueueItem;
}

describe("nextReviewSessionItem", () => {
  const items = [item(10, 100), item(20, 200), item(30, 300)];

  it("advances while preserving submitted items in session order", () => {
    expect(nextReviewSessionItem(items, 20)?.assignmentId).toBe(30);
  });

  it("moves to the previous item after submitting the last review", () => {
    expect(nextReviewSessionItem(items, 30)?.assignmentId).toBe(20);
  });

  it("keeps the final review selected instead of closing the modal", () => {
    expect(nextReviewSessionItem([item(10, 100)], 10)?.assignmentId).toBe(10);
  });
});
