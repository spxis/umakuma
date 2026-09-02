import "server-only";

import {
  PROPOSAL_ACTIONS,
  applyProposal,
  contributionOutcome,
  meaningfulProposals,
  type ListContributions,
  type ProposalAction,
} from "./listContributions";
import { prisma } from "./prisma";
import { normalizeListItems, type StudyListItemRef } from "./studyListRules";
import { attachSubjectIds, replaceListItems } from "./studyLists";
import { viewableList } from "./studyListShares";

/**
 * Other members changing a list: straight onto it when the owner has opened
 * it, as proposals when it is locked, and the owner's decisions on those.
 */

export type PendingProposal = {
  id: string;
  action: ProposalAction;
  item: StudyListItemRef;
  note: string | null;
  proposer: { key: string; name: string };
  createdAt: string;
};

/**
 * A member offers changes to a list they can see: additions typed or filed,
 * or one removal. Applied or proposed by the rule in `listContributions`.
 */
export async function contribute(input: {
  listId: string;
  viewerAccountId: string;
  key: string | null;
  isAdmin: boolean;
  additions: StudyListItemRef[];
  removal: StudyListItemRef | null;
  note: string | null;
}): Promise<{ applied: number; proposed: number } | null> {
  const list = await viewableList(input.listId, input.viewerAccountId, input.key, input.isAdmin);
  if (!list) return null;
  const meta = await prisma.studyList.findUnique({ where: { id: list.id }, select: { contributions: true } });
  const contributions = (meta?.contributions ?? "closed") as ListContributions;
  const isOwner = list.accountId === input.viewerAccountId;

  const wanted = [
    ...normalizeListItems(input.additions).map((item) => ({ action: PROPOSAL_ACTIONS.add, item })),
    ...(input.removal ? [{ action: PROPOSAL_ACTIONS.remove, item: input.removal }] : []),
  ];
  const proposals = meaningfulProposals(list.items, wanted);

  let applied = 0;
  let proposed = 0;
  let items = list.items;
  const toPropose: typeof proposals = [];
  for (const proposal of proposals) {
    if (contributionOutcome({ contributions, action: proposal.action, isOwner }) === "apply") {
      items = applyProposal(items, proposal);
      applied += 1;
    } else {
      toPropose.push(proposal);
    }
  }

  if (applied > 0) await replaceListItems(list.id, items, input.viewerAccountId);

  if (toPropose.length > 0) {
    const resolved = await attachSubjectIds(toPropose.map((proposal) => proposal.item));
    const existing = await prisma.studyListProposal.findMany({
      where: { listId: list.id, status: "pending" },
      select: { action: true, kind: true, key: true },
    });
    const already = new Set(existing.map((row) => `${row.action}:${row.kind}:${row.key}`));
    const rows = toPropose.flatMap((proposal, index) => {
      const item = resolved[index]!;
      const id = `${proposal.action}:${item.kind}:${item.key}`;
      if (already.has(id)) return [];
      already.add(id);
      return [
        {
          listId: list.id,
          accountId: input.viewerAccountId,
          action: proposal.action,
          kind: item.kind,
          key: item.key,
          subjectId: item.subjectId ?? null,
          note: input.note,
        },
      ];
    });
    if (rows.length > 0) await prisma.studyListProposal.createMany({ data: rows });
    proposed = rows.length;
  }

  return { applied, proposed };
}

export async function fetchPendingProposals(listId: string): Promise<PendingProposal[]> {
  const rows = await prisma.studyListProposal.findMany({
    where: { listId, status: "pending" },
    select: {
      id: true,
      action: true,
      kind: true,
      key: true,
      subjectId: true,
      note: true,
      createdAt: true,
      account: { select: { nickname: true, slug: true, wkUsername: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((row) => {
    const key = row.account.slug ?? row.account.wkUsername ?? "";
    return {
      id: row.id,
      action: row.action,
      item: { kind: row.kind, key: row.key, subjectId: row.subjectId },
      note: row.note,
      proposer: { key, name: row.account.nickname ?? key },
      createdAt: row.createdAt.toISOString(),
    };
  });
}

export async function pendingProposalCount(listId: string): Promise<number> {
  return prisma.studyListProposal.count({ where: { listId, status: "pending" } });
}

/** The owner decides. Approving changes the list; either way the proposal is settled. */
export async function decideProposal(
  ownerAccountId: string,
  proposalId: string,
  decision: "approved" | "declined",
): Promise<boolean> {
  const proposal = await prisma.studyListProposal.findFirst({
    where: { id: proposalId, status: "pending", list: { accountId: ownerAccountId } },
    select: {
      id: true,
      action: true,
      kind: true,
      key: true,
      subjectId: true,
      listId: true,
      list: { select: { items: { select: { kind: true, key: true, subjectId: true }, orderBy: { position: "asc" } } } },
    },
  });
  if (!proposal) return false;

  if (decision === "approved") {
    const items = applyProposal(proposal.list.items, {
      action: proposal.action,
      item: { kind: proposal.kind, key: proposal.key, subjectId: proposal.subjectId },
    });
    await replaceListItems(proposal.listId, items, ownerAccountId);
  }
  await prisma.studyListProposal.update({
    where: { id: proposal.id },
    data: { status: decision, decidedAt: new Date() },
  });
  return true;
}

/** The owner opens or locks the list. */
export async function setContributions(ownerAccountId: string, listId: string, contributions: ListContributions): Promise<boolean> {
  const changed = await prisma.studyList.updateMany({ where: { id: listId, accountId: ownerAccountId }, data: { contributions } });
  return changed.count > 0;
}
