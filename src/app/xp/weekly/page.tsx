import Link from "next/link";
import { getServerSession } from "next-auth";

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
import { getVancouverDateKey } from "@/lib/dailySnapshot";
import { xpWeekBefore } from "@/lib/xp/xpWeek";

import { loadXpWeekly } from "../lib/xpWeeklyServer";
import { XP_BOARD_COPY, XP_WEEKLY_COPY as copy } from "../xpBoardCopy";

export const dynamic = "force-dynamic";

export const metadata = { title: `${copy.title} — UmaKuma` };

type PageProps = { searchParams: Promise<{ back?: string }> };

/**
 * Who earned the most this week.
 *
 * Beside the lifetime board rather than instead of it, and the pair is the
 * point: the lifetime board is won by whoever has been here longest, and this
 * one is won by whoever turned up this week. SPX's own capture shows the
 * inversion - second place on the week held twice the leader's lifetime total.
 *
 * `?back=n` steps back n weeks, so last week stays readable on Monday morning
 * rather than vanishing at midnight. Bounded, because the query string is
 * whatever somebody typed.
 */
export default async function XpWeeklyPage({ searchParams }: PageProps) {
  const { back } = await searchParams;
  const stepsBack = Math.min(52, Math.max(0, Math.trunc(Number(back ?? "0")) || 0));

  const session = await getServerSession(authOptions);
  const viewerEmail = session?.user?.email?.trim().toLowerCase() ?? null;
  const isAdmin = isAdminEmail(viewerEmail);
  const viewerMenuInfo = await resolveViewerMenuInfo({
    viewerEmail,
    sessionName: session?.user?.name?.trim() ?? null,
  });
  const address = viewerAddress(viewerMenuInfo);
  const accountId = viewerMenuInfo?.accountId ?? null;

  const week = xpWeekBefore(getVancouverDateKey(new Date()), stepsBack);
  const entries = await loadXpWeekly(
    viewerKind({ isAdmin, hasAccount: Boolean(address) }),
    week,
  );

  const rows: MemberBoardEntry[] = entries.map((entry) => ({
    ...entry,
    isViewer: accountId !== null && entry.id === accountId,
    href: entry.address ? `/users/${encodeURIComponent(entry.address)}/xp` : null,
    caption: copy.lifetime(entry.total),
    figure: copy.earned(entry.earned),
    figureNote: memberBoardGap(entry.toPassAbove, {
      leading: copy.leading,
      level: copy.level,
      toPass: copy.toPass,
    }),
  }));

  return (
    <div className={`${PAGE_WIDTH.wide} ${PAGE_SHELL_PADDING}`}>
      <PublicPageHeader />

      <main className={`${PAGE_WIDTH.reading} space-y-4`}>
        <MemberPageHeader
          icon={DASHBOARD_PAGE_HEADERS.stats.icon}
          title={copy.title}
          subtitle={copy.subtitle(week.year, week.week)}
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
          <p className="text-sm font-semibold leading-relaxed text-foreground/75">{copy.blurb}</p>
          <p className="mt-1 text-xs font-semibold tabular-nums text-foreground/60">
            {copy.range(week.startDayKey, week.endDayKey)}
          </p>
          <div className="mt-3 flex gap-2">
            <Link
              href={`/xp/weekly?back=${stepsBack + 1}`}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-black text-foreground hover:text-accent"
            >
              {copy.previous}
            </Link>
            {stepsBack > 0 ? (
              <Link
                href="/xp/weekly"
                className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-black text-foreground hover:text-accent"
              >
                {copy.current}
              </Link>
            ) : null}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-line bg-surface">
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
