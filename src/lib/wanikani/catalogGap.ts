import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Which subjects the app needs and the catalogue does not hold.
 *
 * `WkSubjectCatalog` is where subject content comes from; anything absent from
 * it falls through to the WaniKani API on every request that wants it, which is
 * the cost the catalogue exists to avoid. Holes are not hypothetical - the
 * incremental sync can be interrupted, and a resumed run picks up where its
 * cursor left off rather than filling in what it skipped.
 *
 * Kept in `lib` rather than in the backfill script because the same question is
 * worth asking without writing anything: the script reports the gap in its
 * dry run, and a check elsewhere can use the same answer.
 */

/** What the app would ask the catalogue for, and what it can actually answer. */
export type CatalogGap = {
  /** Every subject id reachable from a member's assignments or a held row. */
  wanted: number[];
  /** Those the catalogue holds. */
  held: number[];
  /** Those it does not, sorted, which is what a backfill has to fetch. */
  missing: number[];
};

type AssignmentLike = { data?: { subject_id?: unknown }; subject_id?: unknown };

/**
 * The subject ids in one account's cached assignments, whatever shape it is in.
 *
 * Two shapes, because the cache holds whatever the API handed back at the time:
 * rows written from a collection keep WaniKani's `{ data: { subject_id } }`
 * envelope, and rows written from a flattened sync keep `subject_id` at the
 * top. Reading only one of them silently halves the answer, which is the kind
 * of bug that shows up as "the backfill said there was nothing to do".
 *
 * Exported for its own test - it is the part with edge cases, and the rest of
 * this module is database round trips.
 */
export function subjectIdsInCache(cache: unknown): number[] {
  if (!Array.isArray(cache)) return [];

  const ids: number[] = [];
  for (const entry of cache as AssignmentLike[]) {
    const id = entry?.data?.subject_id ?? entry?.subject_id;
    if (typeof id === "number" && Number.isInteger(id) && id > 0) {
      ids.push(id);
    }
  }
  return ids;
}

/**
 * The gap, measured rather than assumed.
 *
 * Two sources, because a subject reaches a member two ways. Their assignments
 * name what they are studying; a held subject's own `componentSubjectIds`,
 * `amalgamationSubjectIds` and `visuallySimilarSubjectIds` name what the detail
 * panels then ask for. Missing either one leaves a request going to the API.
 */
export async function findCatalogGap(): Promise<CatalogGap> {
  const wanted = new Set<number>();

  const accounts = await prisma.account.findMany({ select: { assignmentCache: true } });
  for (const account of accounts) {
    for (const id of subjectIdsInCache(account.assignmentCache)) {
      wanted.add(id);
    }
  }

  const related = await prisma.wkSubjectCatalog.findMany({
    select: {
      wkSubjectId: true,
      componentSubjectIds: true,
      amalgamationSubjectIds: true,
      visuallySimilarSubjectIds: true,
    },
  });

  const held = new Set<number>();
  for (const row of related) {
    held.add(row.wkSubjectId);
    for (const id of row.componentSubjectIds) wanted.add(id);
    for (const id of row.amalgamationSubjectIds) wanted.add(id);
    for (const id of row.visuallySimilarSubjectIds) wanted.add(id);
  }

  const missing = [...wanted].filter((id) => !held.has(id)).sort((a, b) => a - b);

  return {
    wanted: [...wanted].sort((a, b) => a - b),
    held: [...held].sort((a, b) => a - b),
    missing,
  };
}
