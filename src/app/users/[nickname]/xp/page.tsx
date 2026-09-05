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

import { MEMBER_PAGE_HEADERS } from "../dashboardPageHeaders";
import XpRankPanel from "../profile/XpRankPanel";
import { canViewUserPage, resolveViewerMenuInfo } from "../userPageAuth";
import XpActivitySummary from "./XpActivitySummary";
import XpLedgerDays from "./XpLedgerDays";
import { XP_HISTORY_COPY } from "./xpHistoryCopy";
import { loadXpHistory } from "./xpLedgerServer";

/* Prisma-backed, and CI builds with no database to prerender against. */
export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ nickname: string }> };

/**
 * A member's own XP, day by day.
 *
 * Owner-only, the way Study history is: the same `canViewUserPage` check and
 * the same redirect, so there is one answer to who may read somebody's record
 * rather than a second one written here. The board at `/xp` is the public half
 * of this; a total and a rank are a fine thing to show the family, and what
 * somebody did on the eleventh of March is not.
 *
 * The standing at the top is `XpRankPanel`, the same card the profile page
 * draws, rather than a second rendering of the same curve. The member reads the
 * rank in one register in both places, and the panel already derives the rank
 * from the total instead of the materialised `xpLevel`.
 */
export default async function UserXpPage({ params }: PageProps) {
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
      displayName: true,
      slug: true,
      wkUsername: true,
      xp: true,
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

  const history = await loadXpHistory(account.id);
  const name = resolveDisplayName(account);

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
          title={XP_HISTORY_COPY.title}
          subtitle={XP_HISTORY_COPY.subtitle(name)}
          actions={
            <Link
              href="/xp"
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-black text-foreground hover:text-accent"
            >
              {XP_HISTORY_COPY.board}
            </Link>
          }
        />

        <XpRankPanel xp={account.xp} />

        {history.days.length === 0 ? (
          <section className="rounded-2xl border border-line bg-surface p-8 text-center">
            <p className="text-base font-black text-foreground">{XP_HISTORY_COPY.empty}</p>
            <p className="mt-1 text-sm font-semibold text-foreground/70">
              {XP_HISTORY_COPY.emptyHint}
            </p>
          </section>
        ) : (
          <>
            <XpActivitySummary activity={history.activity} byKind={history.byKind} />

            <section className="space-y-2">
              <div>
                <h2 className="text-lg font-black text-foreground">{XP_HISTORY_COPY.ledger}</h2>
                <p className="text-xs font-semibold leading-relaxed text-foreground/60">
                  {XP_HISTORY_COPY.ledgerHint}
                </p>
              </div>
              <XpLedgerDays days={history.days} />
            </section>
          </>
        )}
      </main>
    </div>
  );
}
