import { QUEUE_TYPES, SUBJECT_TYPES, isSubjectType } from "./domainConstants";
import type { ListSubjectRow } from "./studySubjectItems";
import type { StudyTagListItem } from "./studyTagLists";
import { srsLabel } from "./wanikani/helpers";

/**
 * A list's items as every subject surface here draws them.
 *
 * The list pages had rows of their own while the panel used the shared
 * subject cards, which is why a list looked like two different things
 * depending on which control you pressed. One shape now, and it is the shared
 * one: the glyph, the meaning, the readings, the member's own SRS state and
 * tags where they have any.
 *
 * An item the catalogue does not name - a kanji WaniKani never taught - still
 * has to be drawn and keyed, so it takes a negative stand-in id. Nothing that
 * writes to the catalogue accepts one, which is exactly right: it can be read
 * and taken out of the list, and it cannot be tagged.
 */
export type ListPageItem = StudyTagListItem & {
  /** What the list holds it as, for taking it out again. */
  listKind: ListSubjectRow["kind"];
  listKey: string;
  /** Why it is here, in the words of whoever added it. */
  note: string | null;
};

export type MemberState = {
  srsStage: number;
  unlocked: boolean;
  studyTags: { favorite: boolean; trouble: boolean; burned: boolean };
};

export function toListPageItems(
  rows: readonly ListSubjectRow[],
  memberState: ReadonlyMap<number, MemberState> = new Map(),
): ListPageItem[] {
  return rows.map((row, index) => {
    const state = row.subjectId === null ? undefined : memberState.get(row.subjectId);
    const srsStage = state?.srsStage ?? 0;
    return {
      assignmentId: -1,
      queueType: QUEUE_TYPES.review,
      /* Stand-in ids are negative and unique within the page, so React keys
         and the selection stay honest for items WaniKani never taught. */
      subjectId: row.subjectId ?? -(index + 1),
      subjectType: isSubjectType(row.subjectType) ? row.subjectType : SUBJECT_TYPES.kanji,
      wkLevel: row.wkLevel ?? undefined,
      characters: row.glyph,
      meanings: row.meanings.length > 0 ? row.meanings : row.meaning ? [row.meaning] : [],
      readings: row.readings,
      primaryReadings: row.reading ? [row.reading] : [],
      srsStage,
      status: srsLabel(srsStage, srsStage <= 0 || !state?.unlocked),
      startedAt: null,
      passedAt: null,
      availableAt: null,
      studyTags: state?.studyTags ?? { favorite: false, trouble: false, burned: false },
      listKind: row.kind,
      listKey: row.key.includes(":") ? row.key.slice(row.key.indexOf(":") + 1) : row.key,
      note: row.note ?? null,
    };
  });
}
