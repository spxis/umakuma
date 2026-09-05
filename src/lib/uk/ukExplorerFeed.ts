import { QUEUE_TYPES, isSubjectType, type QueueType, type SubjectType } from "@/lib/domainConstants";
import { srsGroupingFromStage } from "@/lib/srs/srsSchedule";
import type { StudyQueueItem } from "@/lib/studyQueueTypes";

import type { UkStudyItem } from "./ukStudyQueue";

/**
 * Our ladder, in the shape the Study explorer already reads.
 *
 * The review interface is one component over three feeds: WaniKani, a custom
 * library, and this. Nothing about how a question is asked, revealed or
 * answered belongs to the feed, so the UK queue is adapted to the explorer
 * rather than drawn by a page of its own. The assignment id the explorer
 * threads through every callback is the UK subject id here - there is no
 * separate assignment row on our ladder, the state is keyed by subject.
 */
export function ukQueueTypeFor(item: Pick<UkStudyItem, "srsStage">): QueueType {
  return item.srsStage === null ? QUEUE_TYPES.lesson : QUEUE_TYPES.review;
}

export function ukSubjectTypeFor(kind: string): SubjectType {
  return isSubjectType(kind) ? kind : "kanji";
}

/**
 * Whose words a chip is showing. WaniKani's for anything it teaches; for the
 * rest, the dictionary (kanji) or RADKFILE (radicals) - never credited as
 * WaniKani's, which is what one shared credit line did for a release.
 */
export function ukContentSourceFor(item: Pick<UkStudyItem, "wkSubjectId" | "kind">): "wanikani" | "kanjidic2" | "radkfile" {
  if (item.wkSubjectId !== null) return "wanikani";
  return item.kind === "radical" ? "radkfile" : "kanjidic2";
}

export function mapUkQueueItem(item: UkStudyItem): StudyQueueItem {
  const srsStage = item.srsStage ?? 0;
  return {
    subjectId: item.subjectId,
    assignmentId: item.subjectId,
    queueType: ukQueueTypeFor(item),
    subjectType: ukSubjectTypeFor(item.kind),
    ukLevel: item.level,
    contentSource: ukContentSourceFor(item),
    characters: item.characters,
    meanings: item.meanings,
    readings: item.readings,
    primaryReadings: item.readings,
    meaningExplanation: "",
    readingExplanation: "",
    srsStage,
    status: srsGroupingFromStage(srsStage),
    /* The latch (`passed`) is a fact about the level gate, drawn on the
       UmaKuma page; the explorer has no slot for it and is not handed a
       pretend date to fill one. */
    passedAt: null,
    availableAt: null,
  };
}

/**
 * Puts WaniKani's radical name on the items they teach.
 *
 * Only the ones already paired, and only for a member the caller has decided
 * may read them - the gate is `loadWanikaniRadicalNames`, which returns an
 * empty map for an account with no connection, so this is a plain merge with
 * nothing to decide. Non-radicals are untouched: the shared curriculum's kanji
 * and vocabulary content is WaniKani's own already, credited as such.
 */
export function withWanikaniRadicalNames(
  items: readonly StudyQueueItem[],
  names: ReadonlyMap<number, string>,
): StudyQueueItem[] {
  if (names.size === 0) return [...items];
  return items.map((item) => {
    const theirs = names.get(item.subjectId);
    return theirs ? { ...item, wanikaniName: theirs } : item;
  });
}

