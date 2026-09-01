import {
  subjectTypeOrVocabulary,
  toSubjectListRow,
  type SubjectListRow,
} from "@/app/shared/subjectListView";

import type { StudyQueueItem } from "./studyExplorerTypes";

/** The shared row shape, carrying its source item for the slot renderers. */
export type StudyRow = SubjectListRow & { item: StudyQueueItem };

/**
 * A queue item as the shared row list wants it.
 *
 * Study keeps its own extras (how late a review is, the tag toggles) in the
 * row's slots rather than in this shape, so the list renderer stays the one the
 * tagged lists and history already use.
 */
export function toStudyRow(item: StudyQueueItem): StudyRow {
  return {
    // WkStatus is what SRS_BUCKETS is built from, so it crosses over as-is.
    ...toSubjectListRow({ ...item, status: item.status }),
    // Lessons and reviews can both hold the same subject, so the queue has to
    // be part of the key or React sees one row where there are two.
    key: `${item.queueType}-${item.subjectId}`,
    // A queue item without a type is drawn as vocabulary rather than untyped.
    subjectType: subjectTypeOrVocabulary(item.subjectType),
    item,
  };
}
