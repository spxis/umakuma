import { cookies } from "next/headers";

import { isAdminEmail } from "@/lib/auth";
import { INVITE_SESSION_COOKIE_NAME, verifyInviteSessionToken } from "@/lib/inviteSession";
import { prisma } from "@/lib/prisma";
import type { ViewerMenuInfo } from "./UserDashboardTabs.types";

function normalizeUsername(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase() ?? "";
  return normalized.length > 0 ? normalized : null;
}

export function canViewUserPage(input: {
  viewerEmail: string | null;
  viewerMenuInfo: ViewerMenuInfo | null;
  targetWkUsername: string;
}): boolean {
  const { viewerEmail, viewerMenuInfo, targetWkUsername } = input;

  if (isAdminEmail(viewerEmail)) {
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
      where: { joinedByEmail: viewerEmail },
      select: {
        nickname: true,
        wkUsername: true,
      },
    });

    return {
      provider: "google",
      name: viewerAccount?.nickname ?? sessionName ?? viewerEmail.split("@")[0] ?? "Google user",
      email: viewerEmail,
      wkUsername: viewerAccount?.wkUsername ?? null,
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
      joinedByEmail: true,
      inviteCodeHash: true,
    },
  });

  if (!inviteAccount?.wkUsername || !inviteAccount.inviteCodeHash) {
    return null;
  }

  return {
    provider: "invite",
    name: inviteAccount.nickname,
    email: inviteAccount.joinedByEmail,
    wkUsername: inviteAccount.wkUsername,
    isAdmin: false,
  };
}
