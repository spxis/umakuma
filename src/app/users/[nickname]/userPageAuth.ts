import { cookies } from "next/headers";

import { isAdminEmail } from "@/lib/auth";
import { INVITE_SESSION_COOKIE_NAME, verifyInviteSessionToken } from "@/lib/inviteSession";
import { prisma } from "@/lib/prisma";
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
        nickname: true,
        wkUsername: true,
        slug: true,
      },
    });

    return {
      provider: "google",
      name: viewerAccount?.nickname ?? sessionName ?? viewerEmail.split("@")[0] ?? "Google user",
      email: viewerEmail,
      wkUsername: viewerAccount?.wkUsername ?? null,
      slug: viewerAccount?.slug ?? null,
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
      joinedByEmail: true,
      inviteCodeHash: true,
    },
  });

  // An invite account needs a code and one address; the address may be a slug,
  // since an invited member need not have connected WaniKani either.
  if (!inviteAccount?.inviteCodeHash || !(inviteAccount.wkUsername || inviteAccount.slug)) {
    return null;
  }

  return {
    provider: "invite",
    name: inviteAccount.nickname,
    email: inviteAccount.joinedByEmail,
    wkUsername: inviteAccount.wkUsername,
    slug: inviteAccount.slug,
    isAdmin: false,
  };
}
