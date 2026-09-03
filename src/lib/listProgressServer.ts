import "server-only";

import { isVisibleTo, type Viewer } from "./accountVisibility";
import {
  byProgress,
  memberStandings,
  standingFor,
  type ListStanding,
  type MemberStandings,
  type StandingFacts,
} from "./listProgress";
import { prisma } from "./prisma";
import { parseAssignmentCacheRows } from "./wanikani/helpers";

/**
 * Everyone on a shared list, and where each of them stands.
 *
 * "On the list" is its owner plus whoever follows it - the people who would
 * be studying the same set - and each of them is shown only if their own
 * visibility setting allows it. A member who chose private stays out of
 * somebody else's overlay, which is the whole point of having chosen it; the
 * reader always sees themselves, since it is their own progress.
 *
 * One query for the accounts and one for the assignment caches, rather than a
 * round trip per member: a family is a handful of rows, and this runs on a
 * page that is already fetching a list's subjects.
 */

export type ListProgress = {
  members: MemberStandings[];
  /** Per subject, what each member's account says: accountId to standing. */
  standingsBySubject: Map<number, Map<string, ListStanding>>;
  /** Items the catalogue names, which are the only ones anybody has a stage for. */
  trackable: number;
  /** Items it does not, reported rather than counted as nobody's fault. */
  untracked: number;
};

const EMPTY: ListProgress = {
  members: [],
  standingsBySubject: new Map(),
  trackable: 0,
  untracked: 0,
};

export async function loadListProgress(input: {
  listId: string;
  ownerAccountId: string;
  /** Every item's subject id in list order; null where the catalogue has none. */
  subjectIds: readonly (number | null)[];
  viewerAccountId: string | null;
  viewer: Viewer;
}): Promise<ListProgress> {
  const tracked = input.subjectIds.filter((id): id is number => typeof id === "number" && id > 0);
  const untracked = input.subjectIds.length - tracked.length;
  if (tracked.length === 0) return { ...EMPTY, untracked };

  const followers = await prisma.studyListSubscription.findMany({
    where: { listId: input.listId },
    select: { accountId: true },
  });
  const ids = [...new Set([input.ownerAccountId, ...followers.flatMap((row) => (row.accountId ? [row.accountId] : []))])];

  const accounts = await prisma.account.findMany({
    where: { id: { in: ids } },
    select: { id: true, nickname: true, displayName: true, slug: true, visibility: true, assignmentCache: true },
  });

  const members = accounts
    /* Their own choice, except about themselves - a reader always sees their own progress. */
    .filter((account) => account.id === input.viewerAccountId || isVisibleTo(account.visibility, input.viewer))
    .map((account) => {
      const facts = new Map<number, StandingFacts>();
      for (const row of parseAssignmentCacheRows(account.assignmentCache)) {
        const subjectId = row.data.subject_id;
        if (typeof subjectId !== "number") continue;
        facts.set(subjectId, {
          srsStage: typeof row.data.srs_stage === "number" ? row.data.srs_stage : 0,
          unlocked: Boolean(row.data.unlocked_at),
        });
      }
      const name = account.displayName ?? account.nickname ?? account.slug ?? "";
      return { account, standings: memberStandings({ accountId: account.id, name }, tracked, (id) => facts.get(id)), facts };
    });

  const standingsBySubject = new Map<number, Map<string, ListStanding>>();
  for (const subjectId of tracked) {
    const row = new Map<string, ListStanding>();
    for (const member of members) {
      row.set(member.account.id, standingFor(member.facts.get(subjectId)));
    }
    standingsBySubject.set(subjectId, row);
  }

  return {
    members: byProgress(members.map((member) => member.standings)),
    standingsBySubject,
    trackable: tracked.length,
    untracked,
  };
}
