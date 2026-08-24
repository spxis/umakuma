import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";

import GameModeClient from "@/app/game/GameModeClient";
import AppTopMenuRow from "@/app/shared/AppTopMenuRow";
import UmaKumaPageBanner from "@/app/shared/UmaKumaPageBanner";
import { authOptions, isAdminEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewUserPage, resolveViewerMenuInfo } from "../userPageAuth";

type Props = {
  params: Promise<{ nickname: string }>;
};

export default async function GamePage({ params }: Props) {
  const session = await getServerSession(authOptions);
  const viewerEmail = session?.user?.email?.trim().toLowerCase() ?? null;
  const viewerMenuInfo = await resolveViewerMenuInfo({
    viewerEmail,
    sessionName: session?.user?.name?.trim() ?? null,
  });
  if (!viewerMenuInfo?.wkUsername) redirect("/join");

  const { nickname } = await params;
  const account = await prisma.account.findFirst({
    where: { wkUsername: decodeURIComponent(nickname) },
    select: { id: true, nickname: true, wkUsername: true, lastSyncedAt: true, lastActivityAt: true },
  });
  if (!account) notFound();
  if (!canViewUserPage({ viewerEmail, viewerMenuInfo, targetWkUsername: account.wkUsername })) {
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
        lastActivityAt={account.lastActivityAt?.toISOString() ?? null}
        className="mb-2"
      />
      <UmaKumaPageBanner variant="user" className="mb-3" />
      <GameModeClient
        accountId={account.id}
        nickname={account.nickname}
        wkUsername={account.wkUsername}
      />
    </div>
  );
}
