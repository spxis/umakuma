import type { StudyQueueItem } from "./studyExplorerTypes";
import { studyItemEnglishTitle } from "./studyExplorerUtils";

export function buildStudySubmissionItemLabel(item: StudyQueueItem | null): string {
  return item ? `${item.characters} (${studyItemEnglishTitle(item)})` : "item";
}

export function buildStudyReviewRequestBody({
  assignmentId,
  result,
  itemForSubmit,
  customLibraryId,
}: {
  assignmentId: number;
  result: "correct" | "wrong";
  itemForSubmit: StudyQueueItem | null;
  customLibraryId: string | null;
}) {
  return {
    assignmentId,
    result,
    ...(itemForSubmit?.isInjectedTrouble
      ? { practiceSubjectId: itemForSubmit.subjectId, practiceType: "trouble" as const }
      : {}),
    ...(customLibraryId ? { libraryId: customLibraryId } : {}),
  };
}
