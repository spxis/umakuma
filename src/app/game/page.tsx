import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";

import AppTopMenuRow from "@/app/shared/AppTopMenuRow";
import { authOptions, isAdminEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewUserPage, resolveViewerMenuInfo } from "@/app/users/[nickname]/userPageAuth";
import GameModeClient from "./GameModeClient";

type Props = {
  searchParams: Promise<{ accountId?: string }>;
};

export default async function GamePage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  const viewerEmail = session?.user?.email?.trim().toLowerCase() ?? null;
  const viewerMenuInfo = await resolveViewerMenuInfo({
    viewerEmail,
    sessionName: session?.user?.name?.trim() ?? null,
  });
  if (!viewerMenuInfo?.wkUsername) redirect("/join");

  const { accountId } = await searchParams;
  const account = accountId
    ? await prisma.account.findUnique({
        where: { id: accountId },
        select: { id: true, nickname: true, wkUsername: true, lastSyncedAt: true, lastActivityAt: true },
      })
    : await prisma.account.findFirst({
        where: { wkUsername: viewerMenuInfo.wkUsername },
        select: { id: true, nickname: true, wkUsername: true, lastSyncedAt: true, lastActivityAt: true },
      });
  if (!account) notFound();
  if (!canViewUserPage({ viewerEmail, viewerMenuInfo, targetWkUsername: account.wkUsername })) {
    redirect("/join?access=denied");
  }

  return (
    <main className="min-h-screen">
      <AppTopMenuRow
        viewerMenuInfo={viewerMenuInfo}
        primaryWkUsername={account.wkUsername}
        accountId={account.id}
        showAdminActions={isAdminEmail(viewerEmail)}
        lastSyncedAt={account.lastSyncedAt.toISOString()}
        lastActivityAt={account.lastActivityAt?.toISOString() ?? null}
        className="mx-auto w-full max-w-7xl px-3 pt-3 sm:px-6 lg:px-8"
      />
      <GameModeClient
        accountId={account.id}
        nickname={account.nickname}
        wkUsername={account.wkUsername}
      />
    </main>
  );
}
