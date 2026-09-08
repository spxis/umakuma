/**
 * What a library item is called everywhere a subject is keyed by id.
 *
 * The same overlap our ladder had: `CustomStudyItem.id` is its own sequence
 * inside WaniKani's range (1,861 items so far, WaniKani's ids run to 9,539),
 * so a trouble mark on a library kanji was a mark on whichever WaniKani
 * subject shared the number. An item WaniKani also teaches records that link
 * in `metadata.wk.subjectId` when the library was enriched, and answers to
 * it - one mark per subject, whichever feed it was made from. The rest take
 * a reserved id below our ladder's range and above every real one. The
 * review and lesson routes key on `assignmentId`, the state's own id.
 */
export const CUSTOM_ITEM_ID_BASE = 70_000_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** WaniKani's id for the same subject, where the enrichment found one. */
export function readWkSubjectId(metadata: unknown): number | null {
  if (!isRecord(metadata) || !isRecord(metadata.wk) || typeof metadata.wk.subjectId !== "number") return null;
  const subjectId = metadata.wk.subjectId;
  return Number.isInteger(subjectId) && subjectId > 0 ? subjectId : null;
}

export function customItemIdentity(item: { id: number; metadata?: unknown }): number {
  return readWkSubjectId(item.metadata) ?? CUSTOM_ITEM_ID_BASE + item.id;
}

export function isCustomOnlySubjectId(subjectId: number): boolean {
  return subjectId >= CUSTOM_ITEM_ID_BASE && subjectId < CUSTOM_ITEM_ID_BASE + 10_000_000;
}

/** The item's own id, back out of a reserved identity. */
export function customItemIdFromIdentity(subjectId: number): number | null {
  return isCustomOnlySubjectId(subjectId) ? subjectId - CUSTOM_ITEM_ID_BASE : null;
}
