import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import AppTopMenuRow from "@/app/shared/AppTopMenuRow";
import MemberPageHeader from "@/app/shared/MemberPageHeader";
import { PAGE_SHELL_PADDING, PAGE_WIDTH } from "@/app/shared/pageShell";
import { viewsOwnPage } from "@/app/shared/viewerAddress";
import { accountUrlKeyWhere } from "@/lib/accountLookup";
import { authOptions, isAdminEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { MEMBER_PAGE_HEADERS } from "../dashboardPageHeaders";
import { canViewUserPage, resolveViewerMenuInfo } from "../userPageAuth";

/**
 * The frame every Lists page shares.
 *
 * Lists went from one page holding four collections stacked down it to four
 * pages named in the header's second row, which is what the row is for. They
 * differ only in which collection they draw, so the sixty lines of session,
 * account lookup, access check and header live here once rather than four
 * times.
 */
export type ListsPageContext = {
  accountId: string;
  /** The member's own address segment, already decoded. */
  userKey: string;
  /** Whether the viewer is the member, rather than someone reading their pages. */
  canEdit: boolean;
  practicePath: string;
};

export async function loadListsPage(nickname: string): Promise<ListsPageContext & { frame: FrameProps }> {
  const session = await getServerSession(authOptions);
  const viewerEmail = session?.user?.email?.trim().toLowerCase() ?? null;
  const viewerMenuInfo = await resolveViewerMenuInfo({
    viewerEmail,
    sessionName: session?.user?.name?.trim() ?? null,
  });

  const userKey = decodeURIComponent(nickname);
  const account = await prisma.account.findFirst({
    where: accountUrlKeyWhere(userKey),
    select: { id: true, lastSyncedAt: true, lastActivityAt: true },
  });
  if (!account) {
    notFound();
  }
  if (!canViewUserPage({ viewerEmail, viewerMenuInfo, targetWkUsername: userKey, targetSlug: userKey })) {
    redirect("/join?access=denied");
  }

  return {
    accountId: account.id,
    userKey,
    canEdit: viewsOwnPage(viewerMenuInfo, userKey),
    practicePath: `/users/${encodeURIComponent(nickname)}/practice`,
    frame: {
      viewerMenuInfo,
      userKey,
      accountId: account.id,
      showAdminActions: isAdminEmail(viewerEmail),
      lastSyncedAt: account.lastSyncedAt?.toISOString() ?? null,
      lastActivityAt: account.lastActivityAt?.toISOString() ?? null,
    },
  };
}

type FrameProps = {
  viewerMenuInfo: Awaited<ReturnType<typeof resolveViewerMenuInfo>>;
  userKey: string;
  accountId: string;
  showAdminActions: boolean;
  lastSyncedAt: string | null;
  lastActivityAt: string | null;
};

/**
 * The header and page shell.
 *
 * Title and subtitle both name the collection, so a member on the auto lists
 * is not told they are looking at their own. The words are the page's existing
 * headings rather than new ones, which is also what the second row shows.
 */
export function ListsPageShell({
  frame,
  title,
  subtitle,
  actions,
  children,
}: {
  frame: FrameProps;
  title: string;
  subtitle: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={`${PAGE_WIDTH.wide} ${PAGE_SHELL_PADDING}`}>
      <AppTopMenuRow
        viewerMenuInfo={frame.viewerMenuInfo}
        primaryWkUsername={frame.userKey}
        accountId={frame.accountId}
        showAdminActions={frame.showAdminActions}
        lastSyncedAt={frame.lastSyncedAt}
        lastActivityAt={frame.lastActivityAt}
        className="mb-4"
      />
      <MemberPageHeader
        icon={MEMBER_PAGE_HEADERS.lists.icon}
        title={title}
        subtitle={subtitle}
        className="mb-4"
        actions={actions}
      />
      {children}
    </div>
  );
}
