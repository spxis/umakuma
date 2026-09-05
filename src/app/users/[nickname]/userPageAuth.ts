import { cookies } from "next/headers";

import { isAccountBarred } from "@/lib/accountStanding";
import { isAdminEmail } from "@/lib/auth";
import { INVITE_SESSION_COOKIE_NAME, verifyInviteSessionToken } from "@/lib/inviteSession";
import { prisma } from "@/lib/prisma";
import { hasWanikaniConnection } from "@/lib/wanikaniConnection";
import type { ViewerMenuInfo } from "./UserDashboardTabs.types";

function normalizeUsername(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase() ?? "";
  return normalized.length > 0 ? normalized : null;
}

/**
 * Whether this viewer may see this account's pages.
 *
 * Matches on either address the account answers to. It used to compare
 * WaniKani usernames alone, which locked every account without a WaniKani
 * connection out of its own pages: the caller passes the slug when there is no
 * username, and the viewer's side could only ever produce null. A member who
 * signs in with Google and plays the map game has no WaniKani anything.
 */
export function canViewUserPage(input: {
  viewerEmail: string | null;
  viewerMenuInfo: ViewerMenuInfo | null;
  targetWkUsername: string;
  targetSlug?: string | null;
}): boolean {
  const { viewerEmail, viewerMenuInfo, targetWkUsername, targetSlug } = input;

  if (isAdminEmail(viewerEmail)) {
    return true;
  }

  const viewerSlug = normalizeUsername(viewerMenuInfo?.slug);
  const wantedSlug = normalizeUsername(targetSlug ?? null);
  if (viewerSlug && wantedSlug && viewerSlug === wantedSlug) {
    return true;
  }

  const viewerUsername = normalizeUsername(viewerMenuInfo?.wkUsername);
  const targetUsername = normalizeUsername(targetWkUsername);
  return Boolean(viewerUsername && targetUsername && viewerUsername === targetUsername);
}

/**
 * Which account, if any, this viewer is.
 *
 * A rejected account resolves to nothing, on both paths. That is the whole of
 * the lock at page level: with no account to match against, `canViewUserPage`
 * refuses their own pages, `viewerKind` reads them as a signed-in stranger,
 * and the header offers them what it offers anyone who is not a member. The
 * alternative - a check at each of the dozen pages - is the kind that gets
 * forgotten on the thirteenth.
 */
export async function resolveViewerMenuInfo(input: {
  viewerEmail: string | null;
  sessionName: string | null;
}): Promise<ViewerMenuInfo | null> {
  const { viewerEmail, sessionName } = input;
  const viewerIsAdmin = isAdminEmail(viewerEmail);

  if (viewerEmail) {
    // The linked email is the only thing that may resolve a Google viewer to
    // an account. Matching the session's display name against nicknames used
    // to be the fallback, which handed anyone whose Google name was "Jay" the
    // account nicknamed Jay - a page-level grant to a stranger. Accounts with
    // no linked email sign in with their invite code instead.
    const viewerAccount = await prisma.account.findFirst({
      where: { joinedByEmail: { equals: viewerEmail, mode: "insensitive" } },
      select: {
        id: true,
        nickname: true,
        wkUsername: true,
        slug: true,
        internal: true,
        approvalStatus: true,
        disabledAt: true,
        tokenEncrypted: true,
        tokenIv: true,
        tokenTag: true,
      },
    });

    /*
     * A barred account - turned away, or switched off since - is nobody here.
     * Not null, though: the session is real, and the menu still has to offer
     * them a way to sign out of it.
     */
    const viewerIsMember = viewerAccount !== null && !isAccountBarred(viewerAccount);

    return {
      provider: "google",
      name:
        (viewerIsMember ? viewerAccount.nickname : null) ??
        sessionName ??
        viewerEmail.split("@")[0] ??
        "Google user",
      email: viewerEmail,
      wkUsername: viewerIsMember ? viewerAccount.wkUsername : null,
      slug: viewerIsMember ? viewerAccount.slug : null,
      accountId: viewerIsMember ? viewerAccount.id : null,
      hasWanikani: viewerIsMember && hasWanikaniConnection(viewerAccount),
      internal: viewerIsMember ? viewerAccount.internal : false,
      isAdmin: viewerIsAdmin,
    };
  }

  const cookieStore = await cookies();
  const inviteToken = cookieStore.get(INVITE_SESSION_COOKIE_NAME)?.value ?? null;
  const invitePayload = inviteToken ? verifyInviteSessionToken(inviteToken) : null;
  if (!invitePayload?.accountId) {
    return null;
  }

  const inviteAccount = await prisma.account.findUnique({
    where: { id: invitePayload.accountId },
    select: {
      nickname: true,
      wkUsername: true,
      slug: true,
      internal: true,
      joinedByEmail: true,
      inviteCodeHash: true,
      approvalStatus: true,
      disabledAt: true,
      tokenEncrypted: true,
      tokenIv: true,
      tokenTag: true,
    },
  });

  // An invite account needs a code and one address; the address may be a slug,
  // since an invited member need not have connected WaniKani either. A barred
  // one is refused outright - unlike a Google session there is nothing else the
  // cookie is good for, and `/api/invite/session` clears it on the next call.
  if (!inviteAccount?.inviteCodeHash || !(inviteAccount.wkUsername || inviteAccount.slug)) {
    return null;
  }
  if (isAccountBarred(inviteAccount)) {
    return null;
  }

  return {
    provider: "invite",
    name: inviteAccount.nickname,
    email: inviteAccount.joinedByEmail,
    wkUsername: inviteAccount.wkUsername,
    slug: inviteAccount.slug,
    accountId: invitePayload.accountId,
    hasWanikani: hasWanikaniConnection(inviteAccount),
    internal: inviteAccount.internal,
    isAdmin: false,
  };
}
