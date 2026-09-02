import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";

import GameModeClient from "@/app/game/GameModeClient";
import GameSubNav from "@/app/game/GameSubNav";
import AppTopMenuRow from "@/app/shared/AppTopMenuRow";
import MemberPageHeader from "@/app/shared/MemberPageHeader";
import { authOptions, isAdminEmail } from "@/lib/auth";
import { gameKindForSlug } from "@/lib/gameKindAddress";
import { prisma } from "@/lib/prisma";
import { accountUrlKeyWhere } from "@/lib/accountLookup";
import { canViewUserPage, resolveViewerMenuInfo } from "../../userPageAuth";
import { viewerAddress } from "@/app/shared/viewerAddress";
import { DASHBOARD_PAGE_HEADERS } from "../../dashboardPageHeaders";
import { GAME_PAGE_HEADER } from "@/app/game/GameMode.constants";

type Props = {
  /** The game being played, when the address names one: `/game/practice`. */
  params: Promise<{ nickname: string; kind?: string[] }>;
};

export default async function GamePage({ params }: Props) {
  const session = await getServerSession(authOptions);
  const viewerEmail = session?.user?.email?.trim().toLowerCase() ?? null;
  const viewerMenuInfo = await resolveViewerMenuInfo({
    viewerEmail,
    sessionName: session?.user?.name?.trim() ?? null,
  });
  if (!viewerAddress(viewerMenuInfo)) redirect("/join");

  const { nickname, kind } = await params;
  /* A name that is not a game is not a page; it must not open the hub quietly. */
  const initialKind = kind?.length ? gameKindForSlug(kind[0]) : null;
  if (kind?.length && (!initialKind || kind.length > 1)) notFound();
  const account = await prisma.account.findFirst({
    where: accountUrlKeyWhere(decodeURIComponent(nickname)),
    select: { id: true, nickname: true, wkUsername: true, lastSyncedAt: true, lastActivityAt: true },
  });
  if (!account) notFound();
  if (!canViewUserPage({
    viewerEmail,
    viewerMenuInfo,
    targetWkUsername: decodeURIComponent(nickname),
    targetSlug: decodeURIComponent(nickname),
  })) {
    redirect("/join?access=denied");
  }

  return (
    <div className="px-2 py-1.5 sm:px-6 sm:py-4 lg:px-8">
      <AppTopMenuRow
        viewerMenuInfo={viewerMenuInfo}
        primaryWkUsername={decodeURIComponent(nickname)}
        accountId={account.id}
        showAdminActions={isAdminEmail(viewerEmail)}
        lastSyncedAt={account.lastSyncedAt.toISOString()}
        lastActivityAt={account.lastActivityAt?.toISOString() ?? null}
        className="mb-2"
        subNav={<GameSubNav />}
      />
      <MemberPageHeader
        icon={DASHBOARD_PAGE_HEADERS.learn.icon}
        title={GAME_PAGE_HEADER.title}
        subtitle={GAME_PAGE_HEADER.subtitle}
        className="mb-3"
      />
      <GameModeClient
        accountId={account.id}
        nickname={account.nickname}
        member={decodeURIComponent(nickname)}
        initialKind={initialKind}
      />
    </div>
  );
}
