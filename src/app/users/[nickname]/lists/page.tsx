import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";

import AppTopMenuRow from "@/app/shared/AppTopMenuRow";
import { PAGE_SHELL_PADDING, PAGE_WIDTH } from "@/app/shared/pageShell";
import { STUDY_LIST_COPY } from "@/app/shared/studyListCopy";
import { viewsOwnPage } from "@/app/shared/viewerAddress";
import { accountUrlKeyWhere } from "@/lib/accountLookup";
import { authOptions, isAdminEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchFollowedLists, fetchFollowedLiveKeys } from "@/lib/studyListShares";
import { fetchStudyLists } from "@/lib/studyLists";
import { fetchTaggedListSummaries } from "@/lib/studySubjectTags";

import { canViewUserPage, resolveViewerMenuInfo } from "../userPageAuth";
import ArchivedLists from "./ArchivedLists";
import AutoListSections from "@/app/shared/AutoListSections";
import FollowedLists from "./FollowedLists";
import ImportFromTextButton from "./ImportFromTextButton";
import MergeListsButton from "./MergeListsButton";
import NewListButton from "./NewListButton";
import StudyListCards from "./StudyListCards";

type PageProps = {
  params: Promise<{ nickname: string }>;
};

/**
 * Every list a member has built, with a preview of what is in each.
 *
 * The page a parent opens to see what a week covers, which is why the cards
 * show the characters rather than a count. Visible to whoever may see the
 * member's pages; editable only by the member.
 */
export default async function UserListsPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  const viewerEmail = session?.user?.email?.trim().toLowerCase() ?? null;
  const viewerMenuInfo = await resolveViewerMenuInfo({
    viewerEmail,
    sessionName: session?.user?.name?.trim() ?? null,
  });

  const { nickname } = await params;
  const userKey = decodeURIComponent(nickname);

  const account = await prisma.account.findFirst({
    where: accountUrlKeyWhere(userKey),
    select: { id: true, lastSyncedAt: true, lastActivityAt: true },
  });
  if (!account) {
    notFound();
  }
  if (!canViewUserPage({ viewerEmail, viewerMenuInfo, targetWkUsername: userKey, targetSlug: userKey })) {
    redirect("/join?access=denied");
  }

  /*
   * Both kinds, together. Trouble and Favourites are the two lists every
   * member has, and the page that is meant to show a member their lists was
   * the one place they did not appear.
   */
  const canEdit = viewsOwnPage(viewerMenuInfo, userKey);
  const [lists, taggedLists, followed, archived, followedLive] = await Promise.all([
    fetchStudyLists(account.id),
    fetchTaggedListSummaries(account.id),
    /* What a member follows, and has put away, is theirs to see, not the page's visitors'. */
    canEdit ? fetchFollowedLists(account.id) : Promise.resolve([]),
    canEdit ? fetchStudyLists(account.id, true) : Promise.resolve([]),
    canEdit ? fetchFollowedLiveKeys(account.id) : Promise.resolve([]),
  ]);

  return (
    <div className={`${PAGE_WIDTH.wide} ${PAGE_SHELL_PADDING}`}>
      <AppTopMenuRow
        viewerMenuInfo={viewerMenuInfo}
        primaryWkUsername={userKey}
        accountId={account.id}
        showAdminActions={isAdminEmail(viewerEmail)}
        lastSyncedAt={account.lastSyncedAt?.toISOString() ?? null}
        lastActivityAt={account.lastActivityAt?.toISOString() ?? null}
        className="mb-4"
      />

      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black">{STUDY_LIST_COPY.heading}</h1>
          <p className="text-xs text-foreground/60">{STUDY_LIST_COPY.subtitle}</p>
        </div>
        {/* A page called Your lists needs a way to make one. */}
        {canEdit ? (
          <span className="flex flex-wrap items-center gap-2">
            <ImportFromTextButton accountId={account.id} />
            <MergeListsButton accountId={account.id} lists={lists} />
            <NewListButton accountId={account.id} />
          </span>
        ) : null}
      </header>

      <StudyListCards
        lists={lists}
        taggedLists={taggedLists}
        accountId={account.id}
        owner={userKey}
        practicePath={`/users/${encodeURIComponent(nickname)}/practice`}
        canEdit={canEdit}
      />

      {canEdit ? (
        <section className="mt-6">
          <h2 className="text-[11px] font-black uppercase tracking-[0.12em] text-foreground/60">
            {STUDY_LIST_COPY.liveListsHeading}
          </h2>
          <p className="mb-3 text-xs text-foreground/60">{STUDY_LIST_COPY.liveListsBlurb}</p>
          <AutoListSections followedKeys={followedLive} />
        </section>
      ) : null}
      {canEdit && followed.length > 0 ? <FollowedLists lists={followed} accountId={account.id} /> : null}
      {canEdit && archived.length > 0 ? <ArchivedLists lists={archived} accountId={account.id} owner={userKey} /> : null}
    </div>
  );
}
