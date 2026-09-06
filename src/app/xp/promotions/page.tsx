import Link from "next/link";
import { getServerSession } from "next-auth";

import MemberPageHeader from "@/app/shared/MemberPageHeader";
import XpSectionNav from "../XpSectionNav";
import RankName from "@/app/shared/xp/RankName";
import PublicPageHeader from "@/app/shared/PublicPageHeader";
import { PAGE_SHELL_PADDING, PAGE_WIDTH } from "@/app/shared/pageShell";
import { viewerAddress } from "@/app/shared/viewerAddress";
import { DASHBOARD_PAGE_HEADERS } from "@/app/users/[nickname]/dashboardPageHeaders";
import { resolveViewerMenuInfo } from "@/app/users/[nickname]/userPageAuth";
import { viewerKind } from "@/lib/accountListing";
import { authOptions, isAdminEmail } from "@/lib/auth";
import { getVancouverDateKey } from "@/lib/dailySnapshot";
import { xpForLevel } from "@/lib/xp/xpCurve";

import { XP_PROMOTION_WINDOW_DAYS, loadXpPromotions } from "../lib/xpPromotionsServer";
import { XP_PROMOTIONS_COPY as copy } from "../xpBoardCopy";

export const dynamic = "force-dynamic";

export const metadata = { title: `${copy.title} — UmaKuma` };

/**
 * Who climbed a rank this week.
 *
 * SPX's Promotions page, and the reason it earned a place in the nav: a board
 * says who is ahead, and this says who *moved* - which is the only one of the
 * two a member near the bottom can appear on.
 *
 * Derived rather than recorded. `Account.xp` is the sum of its events by
 * construction, so replaying the window backwards off the current total is
 * exact, and a table for something recomputable would be a second thing to
 * keep true.
 */
export default async function XpPromotionsPage() {
  const session = await getServerSession(authOptions);
  const viewerEmail = session?.user?.email?.trim().toLowerCase() ?? null;
  const isAdmin = isAdminEmail(viewerEmail);
  const viewerMenuInfo = await resolveViewerMenuInfo({
    viewerEmail,
    sessionName: session?.user?.name?.trim() ?? null,
  });
  const address = viewerAddress(viewerMenuInfo);

  const today = new Date();
  const since = getVancouverDateKey(
    new Date(today.getTime() - XP_PROMOTION_WINDOW_DAYS * 86_400_000),
  );
  const groups = await loadXpPromotions(
    viewerKind({ isAdmin, hasAccount: Boolean(address) }),
    since,
  );

  return (
    <div className={`${PAGE_WIDTH.wide} ${PAGE_SHELL_PADDING}`}>
      <PublicPageHeader />

      <main className={`${PAGE_WIDTH.reading} space-y-4`}>
        <XpSectionNav current={"/xp/promotions"} address={address} />
        <MemberPageHeader
          icon={DASHBOARD_PAGE_HEADERS.stats.icon}
          title={copy.title}
          subtitle={copy.subtitle(XP_PROMOTION_WINDOW_DAYS)}
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
        </section>

        {groups.length === 0 ? (
          <section className="rounded-2xl border border-line bg-surface p-8 text-center">
            <p className="text-base font-black text-foreground">{copy.empty}</p>
            <p className="mt-1 text-sm font-semibold text-foreground/70">{copy.emptyHint}</p>
          </section>
        ) : (
          groups.map((group) => (
            <section
              key={group.level}
              className="overflow-hidden rounded-2xl border border-line bg-surface"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line bg-surface-muted px-4 py-2.5">
                <h2 className="text-sm font-black text-foreground">
                  <RankName level={group.level} />
                </h2>
                <p className="text-[11px] font-black tabular-nums text-foreground/60">
                  {copy.groupNeeds(xpForLevel(group.level))}
                </p>
              </div>
              <ol className="divide-y divide-line/60">
                {group.members.map((member) => (
                  <li
                    key={`${member.id}-${member.level}`}
                    className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-2.5"
                  >
                    <p className="min-w-0 flex-1 truncate text-sm font-black text-foreground">
                      {member.address ? (
                        <Link
                          href={`/users/${encodeURIComponent(member.address)}/xp`}
                          className="hover:text-accent"
                        >
                          {member.name}
                        </Link>
                      ) : (
                        member.name
                      )}
                    </p>
                    <p className="shrink-0 text-xs font-semibold tabular-nums text-foreground/60">
                      {copy.total(member.xp)}
                    </p>
                    <p className="shrink-0 text-xs font-semibold tabular-nums text-foreground/60">
                      {copy.on(member.dayKey)}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          ))
        )}
      </main>
    </div>
  );
}
