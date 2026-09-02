import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";

import AppTopMenuRow from "@/app/shared/AppTopMenuRow";
import { PAGE_SHELL_PADDING, PAGE_WIDTH } from "@/app/shared/pageShell";
import { STUDY_TAG_LIST_LABELS } from "@/app/shared/studyTagListsUi";
import { viewerAddress, viewsOwnPage } from "@/app/shared/viewerAddress";
import { accountUrlKeyWhere } from "@/lib/accountLookup";
import { authOptions, isAdminEmail } from "@/lib/auth";
import { LIST_VISIBILITIES, type StudyTag } from "@/lib/domainConstants";
import { LIST_CONTRIBUTIONS } from "@/lib/listContributions";
import { loadMemberState, tagListItems } from "@/lib/listMemberState";
import { toListPageItems } from "@/lib/listPageItems";
import { prisma } from "@/lib/prisma";
import { LIST_KEY_PARAM, canViewList, listShareHref, tagForListSlug } from "@/lib/studyListRules";
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
 * One list at its own address, whichever kind of list it is.
 *
 * `/users/john/lists/week-1` for a set he saved, `/users/john/lists/trouble`
 * for one of the three built-in lists. They are the same page because they
 * are the same thing to a member - a named set of subjects - and the only
 * differences are the ones that follow from where the set came from: a
 * built-in list has no owner to share it with and no suggestions to settle,
 * and taking an item out of it means untagging rather than deleting a row.
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
  const rawKey = query[LIST_KEY_PARAM];
  return {
    userKey,
    account,
    slug: decodeURIComponent(slug),
    key: (Array.isArray(rawKey) ? rawKey[0] : rawKey) ?? null,
  };
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const loaded = await loadPage(params, searchParams);
  if (!loaded) return { title: "List — UmaKuma" };
  const owner = loaded.account.nickname ?? loaded.account.slug ?? loaded.account.wkUsername ?? "";
  const tag = tagForListSlug(loaded.slug);
  if (tag) return { title: `${STUDY_TAG_LIST_LABELS[tag]} · ${owner} — UmaKuma` };
  const list = await findListBySlug(loaded.account.id, loaded.slug);
  if (!list) return { title: "List — UmaKuma" };
  return {
    title: `${list.name} · ${owner} — UmaKuma`,
    description: list.description ?? `${list.items.length} items in a list by ${owner}.`,
  };
}

export default async function StudyListPage({ params, searchParams }: PageProps) {
  const loaded = await loadPage(params, searchParams);
  if (!loaded) notFound();
  const { userKey, account, slug, key } = loaded;

  const session = await getServerSession(authOptions);
  const viewerEmail = session?.user?.email?.trim().toLowerCase() ?? null;
  const viewerMenuInfo = await resolveViewerMenuInfo({
    viewerEmail,
    sessionName: session?.user?.name?.trim() ?? null,
  });
  const isOwner = viewsOwnPage(viewerMenuInfo, userKey);
  const isAdmin = isAdminEmail(viewerEmail);
  const viewerAccountId = viewerMenuInfo?.accountId ?? null;
  const ownerName = account.nickname ?? account.slug ?? account.wkUsername ?? userKey;
  const practicePath = viewerAddress(viewerMenuInfo)
    ? `/users/${encodeURIComponent(viewerAddress(viewerMenuInfo)!)}/practice`
    : "";

  const tag: StudyTag | null = tagForListSlug(slug);
  const header = (
    <AppTopMenuRow
      viewerMenuInfo={viewerMenuInfo}
      primaryWkUsername={isOwner ? userKey : undefined}
      accountId={isOwner ? account.id : undefined}
      showAdminActions={isAdmin}
      lastSyncedAt={account.lastSyncedAt?.toISOString() ?? null}
      lastActivityAt={account.lastActivityAt?.toISOString() ?? null}
      className="mb-4"
    />
  );

  /*
   * A built-in list is one member's own tags, so it is theirs to read and
   * nobody else's - not even an admin's, who has no business in somebody's
   * private marks. It reads as absent rather than forbidden, as a private
   * list does.
   */
  if (tag) {
    if (!isOwner) notFound();
    const items = await tagListItems(account.id, tag);
    const [rows, memberState] = await Promise.all([fetchListSubjectRows(items), loadMemberState(account.id)]);
    return (
      <div className={`${PAGE_WIDTH.wide} ${PAGE_SHELL_PADDING}`}>
        {header}
        <ListPageView
          list={{
            id: `tag:${tag}`,
            name: STUDY_TAG_LIST_LABELS[tag],
            description: null,
            visibility: LIST_VISIBILITIES.private,
            contributions: LIST_CONTRIBUTIONS.closed,
            archivedAt: null,
            tag,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            copyCount: 0,
            shareCount: 0,
            subscriberCount: 0,
            hasSource: false,
            itemCount: rows.length,
          }}
          items={toListPageItems(rows, memberState)}
          owner={{ key: userKey, name: ownerName }}
          viewer={{ isOwner, accountId: viewerAccountId, key: viewerAddress(viewerMenuInfo), signedIn: true, subscribed: false }}
          shareHref={null}
          currentHref={`/users/${encodeURIComponent(userKey)}/lists/${slug}`}
          listKey={null}
          proposals={[]}
          practicePath={practicePath}
        />
      </div>
    );
  }

  const list = await findListBySlug(account.id, slug);
  if (!list) notFound();

  /* A list nobody may open reads as absent, not as forbidden: a refusal confirms the address. */
  if (!canViewList({ visibility: list.visibility, isOwner, isAdmin, shareToken: list.shareToken, key })) {
    notFound();
  }

  const [rows, memberState, subscribed, proposals] = await Promise.all([
    fetchListSubjectRows(list.items),
    loadMemberState(viewerAccountId),
    viewerAccountId && !isOwner ? isSubscribed(list.id, viewerAccountId) : Promise.resolve(false),
    isOwner ? fetchPendingProposals(list.id) : Promise.resolve([]),
  ]);

  return (
    <div className={`${PAGE_WIDTH.wide} ${PAGE_SHELL_PADDING}`}>
      {header}
      <ListPageView
        list={{
          id: list.id,
          name: list.name,
          description: list.description,
          visibility: list.visibility,
          contributions: list.contributions,
          archivedAt: list.archivedAt,
          tag: null,
          createdAt: list.createdAt,
          updatedAt: list.updatedAt,
          copyCount: list.copyCount,
          shareCount: list.shareCount,
          subscriberCount: list.subscriberCount,
          hasSource: list.hasSource,
          itemCount: list.items.length,
        }}
        items={toListPageItems(rows, memberState)}
        owner={{ key: userKey, name: ownerName }}
        viewer={{
          isOwner,
          accountId: viewerAccountId,
          key: viewerAddress(viewerMenuInfo),
          signedIn: Boolean(viewerEmail) || Boolean(viewerMenuInfo),
          subscribed,
        }}
        shareHref={isOwner ? listShareHref(userKey, list.name, list.visibility, list.shareToken) : null}
        currentHref={listShareHref(userKey, list.name, list.visibility, key)}
        listKey={key}
        proposals={proposals}
        practicePath={practicePath}
      />
    </div>
  );
}
