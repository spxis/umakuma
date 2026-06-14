import type { QueueType } from "@/lib/domainConstants";
import type { AssignmentData } from "./queueRouteUtils";

export type StudySubjectTagMap = Map<number, { favorite: boolean; trouble: boolean }>;

export function troubleInjectionCount(reviewCount: number, availableTroubleCount: number): number {
  if (availableTroubleCount <= 0) {
    return 0;
  }

  if (reviewCount <= 0) {
    return Math.min(10, availableTroubleCount);
  }

  return Math.max(0, Math.min(Math.ceil(reviewCount * 0.25), 20, availableTroubleCount));
}

export function mergeTroubleRows(
  reviewRows: Array<{ assignmentId: number; data: AssignmentData; queueType: QueueType }>,
  injectedRows: Array<{ assignmentId: number; data: AssignmentData; queueType: QueueType }>,
) {
  if (injectedRows.length === 0) {
    return reviewRows;
  }

  if (reviewRows.length === 0) {
    return injectedRows;
  }

  const spacing = Math.max(3, Math.floor(reviewRows.length / injectedRows.length) || 1);
  const merged: Array<{ assignmentId: number; data: AssignmentData; queueType: QueueType }> = [];
  let injectedIndex = 0;

  for (let index = 0; index < reviewRows.length; index += 1) {
    merged.push(reviewRows[index]);
    const shouldInject = (index + 1) % spacing === 0;
    if (shouldInject && injectedIndex < injectedRows.length) {
      merged.push(injectedRows[injectedIndex]);
      injectedIndex += 1;
    }
  }

  while (injectedIndex < injectedRows.length) {
    merged.push(injectedRows[injectedIndex]);
    injectedIndex += 1;
  }

  return merged;
}
