import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";

import AppTopMenuRow from "@/app/shared/AppTopMenuRow";
import { PAGE_SHELL_PADDING, PAGE_WIDTH } from "@/app/shared/pageShell";
import { viewerAddress, viewsOwnPage } from "@/app/shared/viewerAddress";
import { accountUrlKeyWhere } from "@/lib/accountLookup";
import { authOptions, isAdminEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LIST_KEY_PARAM, canViewList, listShareHref } from "@/lib/studyListRules";
import { fetchPendingProposals } from "@/lib/studyListContributions";
import { isSubscribed } from "@/lib/studyListShares";
import { findListBySlug } from "@/lib/studyLists";
import { fetchListSubjectRows } from "@/lib/studySubjectItems";

import { resolveViewerMenuInfo } from "../../userPageAuth";
import ListPageView from "./ListPageView";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ nickname: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * One list at its own address: `/users/john/lists/week-1`.
 *
 * A list is a first-class thing here, so it has a page, and the page is the
 * same one for everybody who may open it. The owner sees the controls; a
 * member who was sent the link sees the list; somebody not signed in sees the
 * list and a quiet way to keep it. What differs is decided once, from who is
 * asking and what the owner chose, and never from which page they came in by.
 */
async function loadPage(params: PageProps["params"], searchParams: PageProps["searchParams"]) {
  const { nickname, slug } = await params;
  const query = await searchParams;
  const userKey = decodeURIComponent(nickname);
  const account = await prisma.account.findFirst({
    where: accountUrlKeyWhere(userKey),
    select: { id: true, nickname: true, slug: true, wkUsername: true, lastSyncedAt: true, lastActivityAt: true },
  });
  if (!account) return null;
  const list = await findListBySlug(account.id, decodeURIComponent(slug));
  if (!list) return null;
  const rawKey = query[LIST_KEY_PARAM];
  return { userKey, account, list, key: (Array.isArray(rawKey) ? rawKey[0] : rawKey) ?? null };
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const loaded = await loadPage(params, searchParams);
  if (!loaded) return { title: "List — UmaKuma" };
  const { list, account } = loaded;
  const owner = account.nickname ?? account.slug ?? account.wkUsername ?? "";
  return {
    title: `${list.name} · ${owner} — UmaKuma`,
    description: list.description ?? `${list.items.length} items in a list by ${owner}.`,
  };
}

export default async function StudyListPage({ params, searchParams }: PageProps) {
  const loaded = await loadPage(params, searchParams);
  if (!loaded) notFound();
  const { userKey, account, list, key } = loaded;

  const session = await getServerSession(authOptions);
  const viewerEmail = session?.user?.email?.trim().toLowerCase() ?? null;
  const viewerMenuInfo = await resolveViewerMenuInfo({
    viewerEmail,
    sessionName: session?.user?.name?.trim() ?? null,
  });
  const isOwner = viewsOwnPage(viewerMenuInfo, userKey);
  const isAdmin = isAdminEmail(viewerEmail);

  /* A list nobody may open reads as absent, not as forbidden: a refusal confirms the address. */
  if (!canViewList({ visibility: list.visibility, isOwner, isAdmin, shareToken: list.shareToken, key })) {
    notFound();
  }

  const viewerAccountId = viewerMenuInfo?.accountId ?? null;
  const [rows, subscribed, proposals] = await Promise.all([
    fetchListSubjectRows(list.items),
    viewerAccountId && !isOwner ? isSubscribed(list.id, viewerAccountId) : Promise.resolve(false),
    isOwner ? fetchPendingProposals(list.id) : Promise.resolve([]),
  ]);
  const ownerName = account.nickname ?? account.slug ?? account.wkUsername ?? userKey;
  const shareHref = listShareHref(userKey, list.name, list.visibility, list.shareToken);

  return (
    <div className={`${PAGE_WIDTH.wide} ${PAGE_SHELL_PADDING}`}>
      <AppTopMenuRow
        viewerMenuInfo={viewerMenuInfo}
        primaryWkUsername={isOwner ? userKey : undefined}
        accountId={isOwner ? account.id : undefined}
        showAdminActions={isAdmin}
        lastSyncedAt={account.lastSyncedAt?.toISOString() ?? null}
        lastActivityAt={account.lastActivityAt?.toISOString() ?? null}
        className="mb-4"
      />
      <ListPageView
        list={{
          id: list.id,
          name: list.name,
          description: list.description,
          visibility: list.visibility,
          contributions: list.contributions,
          archivedAt: list.archivedAt,
          createdAt: list.createdAt,
          updatedAt: list.updatedAt,
          copyCount: list.copyCount,
          shareCount: list.shareCount,
          itemCount: list.items.length,
        }}
        rows={rows}
        owner={{ key: userKey, name: ownerName }}
        viewer={{
          isOwner,
          accountId: viewerAccountId,
          key: viewerAddress(viewerMenuInfo),
          signedIn: Boolean(viewerEmail) || Boolean(viewerMenuInfo),
          subscribed,
        }}
        shareHref={isOwner ? shareHref : null}
        currentHref={listShareHref(userKey, list.name, list.visibility, key)}
        listKey={key}
        proposals={proposals}
      />
    </div>
  );
}
