import type { Metadata } from "next";
import { getServerSession } from "next-auth";

import ViewerPreviewBar from "@/app/shared/board/ViewerPreviewBar";
import MemberBoardRows from "@/app/shared/board/MemberBoardRows";
import type { MemberBoardEntry } from "@/app/shared/board/memberBoardView";
import MemberPageHeader from "@/app/shared/MemberPageHeader";
import PublicPageHeader from "@/app/shared/PublicPageHeader";
import { PAGE_SHELL_PADDING, PAGE_WIDTH } from "@/app/shared/pageShell";
import { viewerAddress } from "@/app/shared/viewerAddress";
import { MEMBER_PAGE_HEADERS } from "@/app/users/[nickname]/dashboardPageHeaders";
import { resolveViewerMenuInfo } from "@/app/users/[nickname]/userPageAuth";
import XpSectionNav from "@/app/xp/XpSectionNav";
import { isViewerPreview, viewerKind } from "@/lib/accountListing";
import { authOptions, isAdminEmail } from "@/lib/auth";
import { unLevelBadge, wkLevelBadge } from "@/lib/levelBadge";
import { canOpenMemberRow } from "@/lib/memberBoard";
import { formatDateShort, formatRelativeFromNow } from "@/lib/timeFormat";

import { loadMembersBoard } from "./lib/membersBoardServer";
import { MEMBERS_COPY as copy } from "./membersCopy";

/* Prisma-backed, and CI builds with no database to prerender against. */
export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ as?: string }> };

export const metadata: Metadata = {
  title: "Members — UmaKuma",
  description: copy.subtitle,
};

/**
 * Everyone here, newest first.
 *
 * The same shape as the XP board and drawn by the same rows, because a list of
 * members is a list of members whichever number it is sorted by. What differs
 * is only the figure - the day they joined - and the order.
 *
 * Open to whoever asks, with `listableTo` inside the loader deciding who is
 * listed, exactly as `/xp` does: a visitor sees the members who chose Public,
 * a member sees the family as well, an admin can preview either.
 */
export default async function MembersPage({ searchParams }: PageProps) {
  const { as } = await searchParams;
  const session = await getServerSession(authOptions);
  const viewerEmail = session?.user?.email?.trim().toLowerCase() ?? null;
  const viewerMenuInfo = await resolveViewerMenuInfo({
    viewerEmail,
    sessionName: session?.user?.name?.trim() ?? null,
  });

  const isAdmin = isAdminEmail(viewerEmail);
  const address = viewerAddress(viewerMenuInfo);
  const members = await loadMembersBoard(viewerKind({ isAdmin, hasAccount: Boolean(address), previewAs: as }));
  const viewer = { isAdmin, address, accountId: viewerMenuInfo?.accountId ?? null };

  const rows: MemberBoardEntry[] = members.map((entry) => ({
    ...entry,
    isViewer: viewer.accountId !== null && entry.id === viewer.accountId,
    href: canOpenMemberRow(entry, viewer) && entry.address ? `/users/${encodeURIComponent(entry.address)}/study` : null,
    /* The levels a member has reached, the way a kanji card carries its own -
       and the honest "not placed yet" for somebody who has not started. */
    caption: copy.levels(unLevelBadge(entry.unLevel), wkLevelBadge(entry.wkLevel)) || copy.noLevel,
    figure: copy.joined(formatDateShort(entry.joinedAt)),
    /* Not the distance to the row above - a date has no "to pass". How long
       ago, which is the number a reader scanning for who is new wants. */
    figureNote:
      members.length > 1 && entry.place === members.length && !entry.sharesPlace
        ? copy.first
        : copy.ago(formatRelativeFromNow(entry.joinedAt, { style: "long" })),
  }));

  return (
    <div className={`${PAGE_WIDTH.wide} ${PAGE_SHELL_PADDING}`}>
      <PublicPageHeader />
      <main className={PAGE_WIDTH.wide}>
        <XpSectionNav current={"/members"} address={address} />
        <ViewerPreviewBar isAdmin={isAdmin} previewAs={isViewerPreview(as) ? as : null} path="/members" />
        <MemberPageHeader
          icon={MEMBER_PAGE_HEADERS.profile.icon}
          title={copy.title}
          subtitle={copy.subtitle}
          className="mb-3"
        />

        <p className="mb-3 px-1 text-sm font-semibold leading-relaxed text-foreground/70">{copy.blurb}</p>

        <section className="overflow-hidden rounded-2xl border border-line bg-surface">
          <h2 className="border-b border-line px-4 py-3 text-base font-black text-foreground">
            {copy.count(rows.length)}
          </h2>
          {rows.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-base font-black text-foreground">{copy.empty}</p>
              <p className="mt-1 text-sm font-semibold text-foreground/70">{copy.emptyHint}</p>
            </div>
          ) : (
            <MemberBoardRows entries={rows} copy={{ sharedPlace: copy.sharedPlace, you: copy.you }} />
          )}
        </section>
      </main>
    </div>
  );
}
