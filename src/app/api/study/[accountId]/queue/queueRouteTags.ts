import { interleaveInjected, troubleInjectionCount } from "@/lib/troubleInjection";
import type { QueueType } from "@/lib/domainConstants";
import type { AssignmentData } from "./queueRouteUtils";

export type StudySubjectTagMap = Map<number, { favorite: boolean; trouble: boolean; burned?: boolean }>;

export { troubleInjectionCount };

export function mergeTroubleRows(
  reviewRows: Array<{ assignmentId: number; data: AssignmentData; queueType: QueueType }>,
  injectedRows: Array<{ assignmentId: number; data: AssignmentData; queueType: QueueType }>,
) {
  return interleaveInjected(reviewRows, injectedRows);
}
