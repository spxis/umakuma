/**
 * What a subject on our ladder is called everywhere a subject is keyed by id.
 *
 * `StudySubjectTag`, the practice lists, the glyph viewer's detail fetch and
 * the success rates all key on a WaniKani subject id, because that was the
 * only kind there was. `UkSubject.id` is its own sequence, and the two ranges
 * overlap completely - WaniKani ids run to 9,539 and ours to 9,271 - so a
 * trouble mark on our 身 (id 8252) was a trouble mark on WaniKani's subject
 * 8252, which is a different word. A tag written from one feed appeared under
 * the other, on the wrong item, and nothing could tell.
 *
 * So an item on our ladder answers to the WaniKani id where WaniKani teaches
 * the same subject - the mark on 身 is then one mark, whichever feed it was
 * made from, which is what a member who moved here expects - and to a
 * reserved id far above WaniKani's range for the 176 subjects they never
 * taught, the way map mode reserves ids for the prefectures. The review
 * routes key on `assignmentId`, which stays the ladder's own id.
 */
export const UK_SUBJECT_ID_BASE = 80_000_000;

export function ukSubjectIdentity(subject: { id: number; wkSubjectId: number | null }): number {
  return subject.wkSubjectId ?? UK_SUBJECT_ID_BASE + subject.id;
}

export function isUkOnlySubjectId(subjectId: number): boolean {
  return subjectId >= UK_SUBJECT_ID_BASE && subjectId < UK_SUBJECT_ID_BASE + 10_000_000;
}

/** The ladder's own id, back out of a reserved identity. */
export function ukSubjectIdFromIdentity(subjectId: number): number | null {
  return isUkOnlySubjectId(subjectId) ? subjectId - UK_SUBJECT_ID_BASE : null;
}
