import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import AppTopMenuRow from "@/app/shared/AppTopMenuRow";
import { authOptions, isAdminEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import StudySourceLibraryManagerPanel from "../StudySourceLibraryManagerPanel";
import { canViewUserPage, resolveViewerMenuInfo } from "../userPageAuth";

type PageProps = {
  params: Promise<{ nickname: string }>;
};

export default async function UserLibrariesPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  const viewerEmail = session?.user?.email?.trim().toLowerCase() ?? null;
  const viewerMenuInfo = await resolveViewerMenuInfo({
    viewerEmail,
    sessionName: session?.user?.name?.trim() ?? null,
  });

  const { nickname } = await params;
  const userKey = decodeURIComponent(nickname);

  const account = await prisma.account.findFirst({
    where: { wkUsername: userKey },
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
    targetWkUsername: account.wkUsername,
  });
  if (!canViewThisPage) {
    redirect("/join?access=denied");
  }

  return (
    <div className="px-2 py-1.5 sm:px-6 sm:py-4 lg:px-8">
      <AppTopMenuRow
        viewerMenuInfo={viewerMenuInfo}
        primaryWkUsername={account.wkUsername}
        accountId={account.id}
        showAdminActions={isAdminEmail(viewerEmail)}
        lastSyncedAt={account.lastSyncedAt.toISOString()}
        lastActivityAt={account.lastActivityAt ? account.lastActivityAt.toISOString() : null}
        className="mb-2"
      />
      <main className="space-y-3">
        <StudySourceLibraryManagerPanel accountId={account.id} wkUsername={account.wkUsername} />
      </main>
    </div>
  );
}
