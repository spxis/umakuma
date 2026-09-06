import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound } from "next/navigation";

import MemberBoardRows from "@/app/shared/board/MemberBoardRows";
import { memberBoardGap, type MemberBoardEntry } from "@/app/shared/board/memberBoardView";
import MemberPageHeader from "@/app/shared/MemberPageHeader";
import PublicPageHeader from "@/app/shared/PublicPageHeader";
import { PAGE_SHELL_PADDING, PAGE_WIDTH } from "@/app/shared/pageShell";
import { viewerAddress } from "@/app/shared/viewerAddress";
import { DASHBOARD_PAGE_HEADERS } from "@/app/users/[nickname]/dashboardPageHeaders";
import { resolveViewerMenuInfo } from "@/app/users/[nickname]/userPageAuth";
import { viewerKind } from "@/lib/accountListing";
import { authOptions, isAdminEmail } from "@/lib/auth";
import { XP_RANKS } from "@/lib/xp/xpCurve";

import { canOpenXpBoardRow } from "../../lib/xpBoard";
import { loadXpBoard } from "../../lib/xpBoardServer";
import { isXpRankLevel, xpRankBoard } from "../../lib/xpRankBoard";
import { XP_BOARD_COPY, XP_RANK_BOARD_COPY as copy } from "../../xpBoardCopy";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ level: string }> };

/**
 * Who is standing at one rank.
 *
 * SPX gave every level a board of its own, reached by clicking the level in
 * the chart, and it is what made the chart worth reading: the chart says what
 * a rank costs and this says who is there. The heading names both ends - what
 * this rank asked for and what the next one asks - because those are the two
 * numbers that bound anybody standing on it.
 *
 * The same population as `/xp`: `listableTo` decides who may be listed, so a
 * private member is no more visible on their rank's page than on the board.
 */
export default async function XpRankPage({ params }: PageProps) {
  const { level: raw } = await params;
  if (!isXpRankLevel(raw)) {
    notFound();
  }
  const level = Number(raw);

  const session = await getServerSession(authOptions);
  const viewerEmail = session?.user?.email?.trim().toLowerCase() ?? null;
  const isAdmin = isAdminEmail(viewerEmail);
  const viewerMenuInfo = await resolveViewerMenuInfo({
    viewerEmail,
    sessionName: session?.user?.name?.trim() ?? null,
  });
  const address = viewerAddress(viewerMenuInfo);

  const entries = await loadXpBoard(viewerKind({ isAdmin, hasAccount: Boolean(address) }));
  const rank = xpRankBoard(entries, level);
  const viewer = { isAdmin, address, accountId: viewerMenuInfo?.accountId ?? null };

  const rows: MemberBoardEntry[] = rank.entries.map((entry) => ({
    ...entry,
    isViewer: viewer.accountId !== null && entry.id === viewer.accountId,
    href:
      canOpenXpBoardRow(entry, viewer) && entry.address
        ? `/users/${encodeURIComponent(entry.address)}/xp`
        : null,
    caption: entry.rankName,
    figure: XP_BOARD_COPY.total(entry.xp),
    figureNote: memberBoardGap(entry.toPassAbove, {
      leading: XP_BOARD_COPY.leading,
      level: XP_BOARD_COPY.toPassLevel,
      toPass: XP_BOARD_COPY.toPass,
    }),
  }));

  return (
    <div className={`${PAGE_WIDTH.wide} ${PAGE_SHELL_PADDING}`}>
      <PublicPageHeader />

      <main className={`${PAGE_WIDTH.reading} space-y-4`}>
        <MemberPageHeader
          icon={DASHBOARD_PAGE_HEADERS.stats.icon}
          title={copy.title(rank.name)}
          subtitle={copy.subtitle(rank.level, XP_RANKS)}
          actions={
            <Link
              href="/xp"
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-black text-foreground hover:text-accent"
            >
              {copy.back}
            </Link>
          }
        />

        <section className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
          <p className="text-sm font-semibold leading-relaxed text-foreground/75">
            {copy.needs(rank.needs)}{" "}
            {rank.nextNeeds !== null && rank.nextName !== null
              ? copy.nextNeeds(rank.nextName, rank.level + 1, rank.nextNeeds)
              : copy.atTop}
          </p>
          <p className="mt-1 text-xs font-semibold text-foreground/60">
            {copy.unlocks(rank.gamesPerDay)}
          </p>
        </section>

        <section className="overflow-hidden rounded-2xl border border-line bg-surface">
          <h2 className="border-b border-line px-4 py-3 text-lg font-black text-foreground">
            {copy.standing}
          </h2>
          {rows.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-base font-black text-foreground">{copy.empty}</p>
              <p className="mt-1 text-sm font-semibold text-foreground/70">{copy.emptyHint}</p>
            </div>
          ) : (
            <MemberBoardRows
              entries={rows}
              copy={{ sharedPlace: XP_BOARD_COPY.sharedPlace, you: XP_BOARD_COPY.you }}
            />
          )}
        </section>
      </main>
    </div>
  );
}
