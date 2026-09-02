import { MEMBER_PAGE_HEADERS } from "../dashboardPageHeaders";
import { HISTORY_PAGE_COPY } from "./historyCopy";
import MemberPageHeader from "@/app/shared/MemberPageHeader";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import AppTopMenuRow from "@/app/shared/AppTopMenuRow";
import StudyTagListsButton from "@/app/shared/StudyTagListsButton";
import { authOptions, isAdminEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { accountUrlKeyWhere } from "@/lib/accountLookup";
import { canViewUserPage, resolveViewerMenuInfo } from "../userPageAuth";
import HistoryScopedStudyHistoryTable from "./HistoryScopedStudyHistoryTable";

type PageProps = {
  params: Promise<{ nickname: string }>;
};

export default async function UserHistoryPage({ params }: PageProps) {
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
    select: {
      id: true,
      nickname: true,
      wkUsername: true,
      lastSyncedAt: true,
      lastActivityAt: true,
    },
  });

  if (!account) {
    notFound();
  }

  const canViewThisPage = canViewUserPage({
    viewerEmail,
    viewerMenuInfo,
    targetWkUsername: userKey,
    targetSlug: userKey,
  });
  if (!canViewThisPage) {
    redirect("/join?access=denied");
  }

  return (
    <div className="px-2 py-1.5 sm:px-6 sm:py-4 lg:px-8">
      <AppTopMenuRow
        viewerMenuInfo={viewerMenuInfo}
        primaryWkUsername={userKey}
        accountId={account.id}
        showAdminActions={isAdminEmail(viewerEmail)}
        lastSyncedAt={account.lastSyncedAt.toISOString()}
        lastActivityAt={account.lastActivityAt ? account.lastActivityAt.toISOString() : null}
        className="mb-2"
      />
      <main className="space-y-3">
        <MemberPageHeader
          icon={MEMBER_PAGE_HEADERS.history.icon}
          title={HISTORY_PAGE_COPY.title}
          subtitle={HISTORY_PAGE_COPY.subtitle(account.nickname)}
          actions={<StudyTagListsButton accountId={account.id} size="sm" />}
          className="mb-4"
        />
        <HistoryScopedStudyHistoryTable accountId={account.id} />
      </main>
    </div>
  );
}
