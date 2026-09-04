/**
 * Reserved ids for curriculum items, so they can ride the game and tag tables.
 *
 * `UkSubject.id` is an autoincrement Int starting at 1, which collides head-on
 * with WaniKani's subject ids — the catalogue tops out around 9,539, and
 * `StudySubjectTag` has no column saying which system a `subjectId` came from.
 * Left alone, tagging curriculum item 440 would tag WaniKani's 一.
 *
 * So a curriculum item's id *outside* its own table is `UK_SUBJECT_ID_BASE +
 * id`, the same trick map regions use (`geoSubjectIds.ts`) for the same reason.
 * The base sits clear of WaniKani below it and of the map range above it, and a
 * test pins all three apart.
 */

/** Above every WaniKani subject id, below `MAP_SUBJECT_ID_BASE`. */
export const UK_SUBJECT_ID_BASE = 10_000_000;

/** The id a curriculum item answers to in a game run or a study tag. */
export function toUkGameSubjectId(ukSubjectId: number): number {
  return UK_SUBJECT_ID_BASE + ukSubjectId;
}

/** Whether an id in one of the shared tables belongs to the curriculum. */
export function isUkGameSubjectId(subjectId: number): boolean {
  return subjectId >= UK_SUBJECT_ID_BASE && subjectId < UK_SUBJECT_ID_BASE + 1_000_000;
}

/** The row id behind a shared-table id, or null when it is not one of ours. */
export function ukSubjectIdFrom(subjectId: number): number | null {
  return isUkGameSubjectId(subjectId) ? subjectId - UK_SUBJECT_ID_BASE : null;
}
