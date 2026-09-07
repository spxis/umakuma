import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import AppTopMenuRow from "@/app/shared/AppTopMenuRow";
import MemberPageHeader from "@/app/shared/MemberPageHeader";
import { PAGE_SHELL_PADDING, PAGE_WIDTH } from "@/app/shared/pageShell";
import { resolveDisplayName } from "@/lib/accountIdentity";
import { accountUrlKeyWhere } from "@/lib/accountLookup";
import { authOptions, isAdminEmail } from "@/lib/auth";
import { gameKindHref } from "@/lib/gameKindAddress";
import { prisma } from "@/lib/prisma";

import { MEMBER_PAGE_HEADERS } from "../../dashboardPageHeaders";
import { canViewUserPage, resolveViewerMenuInfo } from "../../userPageAuth";
import GameHistoryTable from "./GameHistoryTable";
import { GAME_HISTORY_COPY as copy } from "./gameHistoryCopy";

/* Prisma-backed, and CI builds with no database to prerender against. */
export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ nickname: string }> };

/**
 * Every game this member has finished, and what each one paid.
 *
 * A static segment beside the games hub's `[[...kind]]` catch-all, which takes
 * it because a literal segment beats a catch-all - and `history` is not one of
 * the kind slugs, so nothing is shadowed either way.
 *
 * The pair is the same one `/xp` and `/xp/history` make: the hub is where you
 * play and see everybody's recent runs, this is your own record and it grows
 * forever, so it is paged from the API rather than loaded whole.
 *
 * Owner-only, the same `canViewUserPage` gate the XP history uses.
 */
export default async function UserGameHistoryPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  const viewerEmail = session?.user?.email?.trim().toLowerCase() ?? null;
  const viewerMenuInfo = await resolveViewerMenuInfo({
    viewerEmail,
    sessionName: session?.user?.name?.trim() ?? null,
  });

  const { nickname } = await params;
  const account = await prisma.account.findFirst({
    where: accountUrlKeyWhere(decodeURIComponent(nickname)),
    select: {
      id: true,
      nickname: true,
      displayName: true,
      slug: true,
      wkUsername: true,
      lastSyncedAt: true,
      lastActivityAt: true,
    },
  });

  if (!account) {
    notFound();
  }

  if (
    !canViewUserPage({
      viewerEmail,
      viewerMenuInfo,
      targetWkUsername: account.wkUsername ?? "",
      targetSlug: account.slug,
    })
  ) {
    redirect("/join?access=denied");
  }

  const address = account.slug ?? account.wkUsername ?? "";

  return (
    <div className={`${PAGE_WIDTH.wide} ${PAGE_SHELL_PADDING}`}>
      <AppTopMenuRow
        viewerMenuInfo={viewerMenuInfo}
        primaryWkUsername={account.wkUsername ?? account.slug}
        accountId={account.id}
        showAdminActions={isAdminEmail(viewerEmail)}
        lastSyncedAt={account.lastSyncedAt?.toISOString() ?? null}
        lastActivityAt={account.lastActivityAt?.toISOString() ?? null}
        className="mb-4"
      />

      <main className={`${PAGE_WIDTH.reading} space-y-4`}>
        <MemberPageHeader
          icon={MEMBER_PAGE_HEADERS.history.icon}
          title={copy.title}
          subtitle={copy.subtitle(resolveDisplayName(account))}
          actions={
            <Link
              href={gameKindHref(address, null)}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-black text-foreground hover:text-accent"
            >
              {copy.back}
            </Link>
          }
        />

        <GameHistoryTable accountId={account.id} />
      </main>
    </div>
  );
}
