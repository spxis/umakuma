import type { StudyQueueItem } from "@/lib/studyQueueTypes";

type StudyTags = NonNullable<StudyQueueItem["studyTags"]>;

/**
 * The member's marks and the practice flag, on any feed's items.
 *
 * Both key on `subjectId`, which is the subject's identity across feeds -
 * WaniKani's id where WaniKani teaches it, a reserved id where it does not -
 * so a trouble mark is one mark whichever feed drew the card, and a trouble
 * item mixed into a sitting is answered as practice the same way everywhere.
 */
export function withStudyTags<T extends { subjectId: number }>(
  items: readonly T[],
  rows: readonly { subjectId: number; favorite: boolean; trouble: boolean; burned: boolean }[],
): (T & { studyTags: StudyTags })[] {
  const bySubject = new Map(rows.map((row) => [row.subjectId, row]));
  return items.map((item) => {
    const row = bySubject.get(item.subjectId);
    return {
      ...item,
      studyTags: { favorite: row?.favorite ?? false, trouble: row?.trouble ?? false, burned: row?.burned ?? false },
    };
  });
}

/**
 * A trouble item mixed into the sitting: the assignment id goes negative the
 * way the WaniKani queue's does, and the review route knows to leave the
 * schedule alone.
 */
export function asInjectedTrouble<T extends { assignmentId: number }>(item: T): T & { isInjectedTrouble: true } {
  return { ...item, assignmentId: -item.assignmentId, isInjectedTrouble: true };
}
