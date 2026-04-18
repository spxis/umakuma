import { getServerSession } from "next-auth";

import { isAuthorizedAdmin } from "@/lib/admin";
import { authOptions } from "@/lib/auth";
import {
  getCookieValue,
  INVITE_SESSION_COOKIE_NAME,
  verifyInviteSessionToken,
} from "@/lib/inviteSession";
import { prisma } from "@/lib/prisma";

export async function canAccessAccount(request: Request, accountId: string): Promise<boolean> {
  if (await isAuthorizedAdmin(request)) {
    return true;
  }

  const inviteToken = getCookieValue(request.headers.get("cookie"), INVITE_SESSION_COOKIE_NAME);
  if (inviteToken) {
    const payload = verifyInviteSessionToken(inviteToken);
    if (payload?.accountId === accountId) {
      return true;
    }
  }

  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase() ?? null;
  if (!email) {
    return false;
  }

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { joinedByEmail: true },
  });
  const linkedEmail = account?.joinedByEmail?.trim().toLowerCase() ?? null;

  return Boolean(linkedEmail && linkedEmail === email);
}
