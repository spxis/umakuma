import "server-only";

import { copyName } from "./listCopy";
import { prisma } from "./prisma";
import { canViewList, listSlug, STUDY_LIST_LIMITS, type StudyListItemRef } from "./studyListRules";

/**
 * Keeping somebody else's list: as a copy that becomes yours, or as a
 * subscription that stays theirs.
 *
 * Two different promises. A copy is rows of your own from that moment on, and
 * remembers where it came from; a subscription is a pointer, read-only and
 * always current, that sits among your lists with the owner's name on it.
 * Both start from the same question - may this member open that list? - and
 * that question is answered by the same rule the list's page uses.
 */

type ListAccess = {
  id: string;
  accountId: string;
  name: string;
  visibility: "private" | "unlisted" | "public";
  shareToken: string | null;
  items: StudyListItemRef[];
};

/** The list, if this member may open it; null reads as absent, the way the page does. */
export async function viewableList(
  listId: string,
  viewerAccountId: string,
  key: string | null,
  isAdmin = false,
): Promise<ListAccess | null> {
  const list = await prisma.studyList.findUnique({
    where: { id: listId },
    select: {
      id: true,
      accountId: true,
      name: true,
      visibility: true,
      shareToken: true,
      items: { select: { kind: true, key: true, subjectId: true }, orderBy: { position: "asc" } },
    },
  });
  if (!list) return null;
  const isOwner = list.accountId === viewerAccountId;
  return canViewList({ visibility: list.visibility, isOwner, isAdmin, shareToken: list.shareToken, key }) ? list : null;
}

/** A copy of the list on this member's shelf, named so it fits, remembering its source. */
export async function copyList(source: ListAccess, accountId: string): Promise<{ id: string; name: string; slug: string }> {
  const existing = await prisma.studyList.findMany({ where: { accountId }, select: { name: true } });
  if (existing.length >= STUDY_LIST_LIMITS.perAccount) throw new Error("That is as many lists as one account holds.");
  const name = copyName(source.name, existing.map((row) => row.name));

  const created = await prisma.$transaction(async (tx) => {
    const list = await tx.studyList.create({
      data: { accountId, name, sourceListId: source.id },
      select: { id: true, name: true },
    });
    if (source.items.length > 0) {
      await tx.studyListItem.createMany({
        data: source.items.map((item, position) => ({
          listId: list.id,
          kind: item.kind,
          key: item.key,
          subjectId: item.subjectId ?? null,
          position,
          addedByAccountId: accountId,
        })),
      });
    }
    await tx.studyList.update({ where: { id: source.id }, data: { copyCount: { increment: 1 } } });
    return list;
  });

  return { ...created, slug: listSlug(created.name) };
}

export async function subscribe(listId: string, accountId: string): Promise<void> {
  await prisma.studyListSubscription.upsert({
    where: { accountId_listId: { accountId, listId } },
    create: { accountId, listId },
    update: {},
  });
}

export async function unsubscribe(listId: string, accountId: string): Promise<void> {
  await prisma.studyListSubscription.deleteMany({ where: { accountId, listId } });
}

export async function isSubscribed(listId: string, accountId: string): Promise<boolean> {
  const row = await prisma.studyListSubscription.findUnique({
    where: { accountId_listId: { accountId, listId } },
    select: { id: true },
  });
  return row !== null;
}

/** How many members keep this list. */
export async function subscriberCount(listId: string): Promise<number> {
  return prisma.studyListSubscription.count({ where: { listId } });
}

export type FollowedList = {
  id: string;
  name: string;
  slug: string;
  ownerKey: string;
  ownerName: string;
  itemCount: number;
  updatedAt: string;
  /** Still openable by this member; a list made private since is kept but says so. */
  reachable: boolean;
  shareToken: string | null;
};

/**
 * The lists this member follows, with the owner named and the way in.
 *
 * A list that has gone private since is still listed, so the member knows
 * what they were following and can drop it; it only stops being openable.
 */
export async function fetchFollowedLists(accountId: string): Promise<FollowedList[]> {
  const rows = await prisma.studyListSubscription.findMany({
    where: { accountId, listId: { not: null } },
    select: {
      list: {
        select: {
          id: true,
          name: true,
          visibility: true,
          shareToken: true,
          updatedAt: true,
          _count: { select: { items: true } },
          account: { select: { nickname: true, slug: true, wkUsername: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return rows.flatMap((row) => {
    const list = row.list;
    if (!list) return [];
    const ownerKey = list.account.slug ?? list.account.wkUsername ?? "";
    return [
      {
        id: list.id,
        name: list.name,
        slug: listSlug(list.name),
        ownerKey,
        ownerName: list.account.nickname ?? ownerKey,
        itemCount: list._count.items,
        updatedAt: list.updatedAt.toISOString(),
        reachable: list.visibility !== "private",
        shareToken: list.visibility === "unlisted" ? list.shareToken : null,
      },
    ];
  });
}
