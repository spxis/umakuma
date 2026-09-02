import "server-only";

import { burnedCandidates } from "./burnList";
import { prisma } from "./prisma";
import { loadAssignmentFacts } from "./studySubjectItems";

/**
 * A member with WaniKani applies their burned items to the Burned list.
 *
 * Never on sync, only on request: the list is theirs, and WaniKani's opinion
 * of what they know is an offer, not an order. Counted first so the button
 * can say what it will do, then applied - marked burned, nothing else on the
 * row touched, and a row already burned by hand left as it is.
 */
export async function wanikaniBurnedCandidates(accountId: string): Promise<number[]> {
  const facts = await loadAssignmentFacts(accountId);
  return burnedCandidates([...facts.entries()].map(([subjectId, fact]) => ({ subjectId, srsStage: fact.srsStage })));
}

export async function applyWanikaniBurned(accountId: string): Promise<{ applied: number; total: number }> {
  const ids = await wanikaniBurnedCandidates(accountId);
  if (ids.length === 0) return { applied: 0, total: 0 };

  const already = await prisma.studySubjectTag.findMany({
    where: { accountId, subjectId: { in: ids }, burned: true },
    select: { subjectId: true },
  });
  const done = new Set(already.map((row) => row.subjectId));
  const fresh = ids.filter((id) => !done.has(id));

  await prisma.$transaction(
    fresh.map((subjectId) =>
      prisma.studySubjectTag.upsert({
        where: { accountId_subjectId: { accountId, subjectId } },
        create: { accountId, subjectId, burned: true },
        update: { burned: true },
      }),
    ),
  );

  return { applied: fresh.length, total: ids.length };
}
