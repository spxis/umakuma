import "server-only";

import { getServerSession } from "next-auth";

import { isLockedOut } from "@/lib/accountApproval";
import { isAuthorizedAdmin } from "@/lib/admin";
import { authOptions } from "@/lib/auth";
import {
  getCookieValue,
  INVITE_SESSION_COOKIE_NAME,
  verifyInviteSessionToken,
} from "@/lib/inviteSession";
import { prisma } from "@/lib/prisma";

/**
 * Whether this request may act as this account.
 *
 * Owning an account is not by itself enough: a rejected account is locked out
 * of its own data too, on every path but the admin's. Otherwise being turned
 * away only removed someone from the leaderboard while leaving every study,
 * game and tag route open to them.
 *
 * The admin bypass stays above the check, because reviewing an account is how
 * a rejection gets reconsidered.
 */
export async function canAccessAccount(request: Request, accountId: string): Promise<boolean> {
  if (await isAuthorizedAdmin(request)) {
    return true;
  }

  const inviteToken = getCookieValue(request.headers.get("cookie"), INVITE_SESSION_COOKIE_NAME);
  if (inviteToken) {
    const payload = verifyInviteSessionToken(inviteToken);
    if (payload?.accountId === accountId) {
      const inviteAccount = await prisma.account.findUnique({
        where: { id: accountId },
        select: { inviteCodeHash: true, approvalStatus: true },
      });

      if (inviteAccount?.inviteCodeHash && !isLockedOut(inviteAccount.approvalStatus)) {
        return true;
      }
    }
  }

  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase() ?? null;
  if (!email) {
    return false;
  }

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { joinedByEmail: true, approvalStatus: true },
  });
  if (!account || isLockedOut(account.approvalStatus)) {
    return false;
  }

  const linkedEmail = account.joinedByEmail?.trim().toLowerCase() ?? null;

  return Boolean(linkedEmail && linkedEmail === email);
}
