import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";

import AppTopMenuRow from "@/app/shared/AppTopMenuRow";
import { PAGE_SHELL_PADDING, PAGE_WIDTH } from "@/app/shared/pageShell";
import { STUDY_LIST_COPY } from "@/app/shared/studyListCopy";
import { viewsOwnPage } from "@/app/shared/viewerAddress";
import { accountUrlKeyWhere } from "@/lib/accountLookup";
import { authOptions, isAdminEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchStudyLists } from "@/lib/studyLists";
import { fetchTaggedListSummaries } from "@/lib/studySubjectTags";

import { canViewUserPage, resolveViewerMenuInfo } from "../userPageAuth";
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
  const [lists, taggedLists] = await Promise.all([
    fetchStudyLists(account.id),
    fetchTaggedListSummaries(account.id),
  ]);
  const canEdit = viewsOwnPage(viewerMenuInfo, userKey);

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

      <header className="mb-4">
        <h1 className="text-xl font-black">{STUDY_LIST_COPY.heading}</h1>
        <p className="text-xs text-foreground/60">{STUDY_LIST_COPY.subtitle}</p>
      </header>

      <StudyListCards
        lists={lists}
        taggedLists={taggedLists}
        accountId={account.id}
        practicePath={`/users/${encodeURIComponent(nickname)}/grades/practice`}
        canEdit={canEdit}
      />
    </div>
  );
}
