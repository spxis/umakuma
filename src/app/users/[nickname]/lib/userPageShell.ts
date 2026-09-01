import "server-only";

import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { accountUrlKeyWhere } from "@/lib/accountLookup";
import { authOptions, isAdminEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { canViewUserPage, resolveViewerMenuInfo } from "../userPageAuth";
import type { ViewerMenuInfo } from "../UserDashboardTabs.types";

/**
 * The part of a member page every member page needs: who is asking, whose page
 * it is, and whether they may see it.
 *
 * Six of these pages used to be one file behind a rewrite - the address said
 * `/users/john/read` and Next served `/users/john?dashboard=read` - so there
 * was one place to do this and one place to load everything else, whether the
 * page showed it or not. Opening Read fetched every level snapshot on the
 * account to render a page about yen.
 *
 * Splitting them into real routes means six copies of this, or one function.
 * This is the function. What a page loads *beyond* it is the page's own
 * business, which is the entire point of the split.
 */

export type UserPageShell = {
  viewerEmail: string | null;
  viewerMenuInfo: ViewerMenuInfo | null;
  viewerIsAdmin: boolean;
  /** The `[nickname]` segment, decoded - a wkUsername or a slug. */
  userKey: string;
  account: {
    id: string;
    nickname: string;
    wkUsername: string | null;
    wkLevel: number;
    joinedByEmail: string | null;
    lastSyncedAt: Date;
    lastActivityAt: Date | null;
  };
  /** The viewer is the member, rather than an admin or a guest. */
  viewerMatchesAccount: boolean;
};

/**
 * Resolve the page's member and the viewer's right to be here.
 *
 * Ends the request itself on failure - `notFound()` for a member who does not
 * exist, a redirect to the join gate for one the viewer may not see - so a
 * caller can treat a returned shell as "everything is fine, carry on".
 */
export async function loadUserPageShell(nickname: string): Promise<UserPageShell> {
  const session = await getServerSession(authOptions);
  const viewerEmail = session?.user?.email?.trim().toLowerCase() ?? null;
  const viewerMenuInfo = await resolveViewerMenuInfo({
    viewerEmail,
    sessionName: session?.user?.name?.trim() ?? null,
  });

  const userKey = decodeURIComponent(nickname);

  const account = await prisma.account.findFirst({
    where: accountUrlKeyWhere(userKey),
    select: {
      id: true,
      nickname: true,
      wkUsername: true,
      wkLevel: true,
      joinedByEmail: true,
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
      targetWkUsername: userKey,
      targetSlug: userKey,
    })
  ) {
    redirect("/join?access=denied");
  }

  const linkedEmail = account.joinedByEmail?.trim().toLowerCase() ?? null;

  return {
    viewerEmail,
    viewerMenuInfo,
    viewerIsAdmin: isAdminEmail(viewerEmail),
    userKey,
    account: { ...account, wkLevel: account.wkLevel ?? 0 },
    viewerMatchesAccount: Boolean(viewerEmail && linkedEmail && viewerEmail === linkedEmail),
  };
}
