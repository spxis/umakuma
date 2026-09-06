import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";

import MemberPageHeader from "@/app/shared/MemberPageHeader";
import PublicPageHeader from "@/app/shared/PublicPageHeader";
import { PAGE_SHELL_PADDING, PAGE_WIDTH } from "@/app/shared/pageShell";
import { viewerAddress } from "@/app/shared/viewerAddress";
import { DASHBOARD_PAGE_HEADERS } from "@/app/users/[nickname]/dashboardPageHeaders";
import { resolveViewerMenuInfo } from "@/app/users/[nickname]/userPageAuth";
import { viewerKind } from "@/lib/accountListing";
import { authOptions, isAdminEmail } from "@/lib/auth";

import XpBoardRows from "./XpBoardRows";
import XpLadderChart from "./XpLadderChart";
import { XP_BOARD_COPY, XP_EARN_COPY, XP_LADDER_COPY } from "./xpBoardCopy";
import { loadXpBoard } from "./lib/xpBoardServer";
import { xpBoardPlacement } from "./lib/xpBoard";

/* Prisma-backed, and CI builds with no database to prerender against. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "XP board — UmaKuma",
  description: XP_BOARD_COPY.subtitle,
};

/**
 * The board everybody is on.
 *
 * A page of its own rather than a tab beside the WaniKani board, for three
 * reasons. It ranks a different population — that board ends in
 * `onlyConnected` and this one deliberately does not, so presenting them as two
 * views of one set would misstate both. It ranks a different number, so none of
 * that board's fifteen sortable columns mean anything here. And the home page
 * it lives on is already at the edge of the 500-line gate.
 *
 * Open to whoever asks, with `listableTo` inside the loader deciding who is
 * listed: a visitor sees the members who chose Public, a member sees the family
 * as well. That is the same answer `/api/leaderboard` gives, arrived at in the
 * same one tested place rather than restated here.
 */
export default async function XpBoardPage() {
  const session = await getServerSession(authOptions);
  const viewerEmail = session?.user?.email?.trim().toLowerCase() ?? null;
  const viewerMenuInfo = await resolveViewerMenuInfo({
    viewerEmail,
    sessionName: session?.user?.name?.trim() ?? null,
  });

  const isAdmin = isAdminEmail(viewerEmail);
  const address = viewerAddress(viewerMenuInfo);
  const entries = await loadXpBoard(viewerKind({ isAdmin, hasAccount: Boolean(address) }));
  const own = xpBoardPlacement(entries, viewerMenuInfo?.accountId ?? null);

  /* How many members the reader may see at each rank. Counted from the board
     this page already loaded rather than queried again, and from the placed
     entries rather than `Account.xpLevel`, for the same reason everything else
     here derives the rank from the total. */
  const standingAt = new Map<number, number>();
  for (const entry of entries) {
    standingAt.set(entry.standing.level, (standingAt.get(entry.standing.level) ?? 0) + 1);
  }

  return (
    <div className={`${PAGE_WIDTH.wide} ${PAGE_SHELL_PADDING}`}>
      <PublicPageHeader />
      <main className={PAGE_WIDTH.wide}>
        <MemberPageHeader
          icon={DASHBOARD_PAGE_HEADERS.stats.icon}
          title={XP_BOARD_COPY.title}
          subtitle={XP_BOARD_COPY.subtitle}
          actions={
            <>
              {/* How the numbers on this board are earned, for anybody
                  wondering why a row moved. Public, so a visitor deciding
                  whether to join can read it too. */}
              <Link
                href="/xp/earn"
                className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-black text-foreground hover:text-accent"
              >
                {XP_EARN_COPY.title}
              </Link>
              {address ? (
                <Link
                  href={`/users/${encodeURIComponent(address)}/xp`}
                  className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-black text-foreground hover:text-accent"
                >
                  {XP_BOARD_COPY.history}
                </Link>
              ) : null}
            </>
          }
          className="mb-3"
        />

        <p className="mb-3 px-1 text-sm font-semibold leading-relaxed text-foreground/70">
          {XP_BOARD_COPY.blurb}
        </p>

        {address ? (
          <p className="mb-3 px-1 text-xs font-black uppercase tracking-[0.08em] text-foreground/60">
            {own
              ? XP_BOARD_COPY.yourPlace(own.place, entries.length)
              : XP_BOARD_COPY.yourPlaceMissing}
          </p>
        ) : null}

        {/*
          * Two columns from `lg` up: who is climbing on the left, what they
          * are climbing on the right. Stacked below that, standings first -
          * on a phone the board is what somebody opened this page for, and
          * the ladder is what they scroll to.
          */}
        <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
          <section className="overflow-hidden rounded-2xl border border-line bg-surface">
            <h2 className="border-b border-line px-4 py-3 text-base font-black text-foreground">
              {XP_LADDER_COPY.standings}
            </h2>
            {entries.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-base font-black text-foreground">{XP_BOARD_COPY.empty}</p>
                <p className="mt-1 text-sm font-semibold text-foreground/70">
                  {XP_BOARD_COPY.emptyHint}
                </p>
              </div>
            ) : (
              <XpBoardRows
                entries={entries}
                viewer={{ isAdmin, address, accountId: viewerMenuInfo?.accountId ?? null }}
              />
            )}
          </section>

          <XpLadderChart xp={own?.xp ?? null} standingAt={standingAt} />
        </div>
      </main>
    </div>
  );
}
