import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import AppTopMenuRow from "@/app/shared/AppTopMenuRow";
import MemberPageHeader from "@/app/shared/MemberPageHeader";
import { PAGE_SHELL_PADDING, PAGE_WIDTH } from "@/app/shared/pageShell";
import { resolveDisplayName } from "@/lib/accountIdentity";
import { accountUrlKeyWhere } from "@/lib/accountLookup";
import { authOptions, isAdminEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { MEMBER_PAGE_HEADERS } from "../../dashboardPageHeaders";
import { canViewUserPage, resolveViewerMenuInfo } from "../../userPageAuth";
import { XP_LEDGER_HISTORY_COPY as copy } from "../xpHistoryCopy";
import XpHistoryTable from "./XpHistoryTable";

/* Prisma-backed, and CI builds with no database to prerender against. */
export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ nickname: string }> };

/**
 * The whole XP record, browsable.
 *
 * `/xp` is the summary - a rank, a streak, the recent days - and it stops.
 * This is the record, and it grows every day forever, so it is paged from the
 * API rather than loaded whole. Study history is the same pair at the same
 * depth (`/study/history`), and this deliberately matches it: one way of
 * reading your own record, not two.
 *
 * Owner-only, the same `canViewUserPage` gate the summary uses.
 */
export default async function UserXpHistoryPage({ params }: PageProps) {
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
          icon={MEMBER_PAGE_HEADERS.profile.icon}
          title={copy.title}
          subtitle={copy.subtitle(resolveDisplayName(account))}
          actions={
            <Link
              href={`/users/${encodeURIComponent(address)}/xp`}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-black text-foreground hover:text-accent"
            >
              {copy.back}
            </Link>
          }
        />

        <XpHistoryTable accountId={account.id} />
      </main>
    </div>
  );
}
