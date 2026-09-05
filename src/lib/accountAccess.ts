import "server-only";

import { getServerSession } from "next-auth";

import { ACCOUNT_STANDING_SELECT, isAccountBarred } from "@/lib/accountStanding";
import { isAuthorizedAdmin } from "@/lib/admin";
import { authOptions } from "@/lib/auth";
import {
  getCookieValue,
  INVITE_SESSION_COOKIE_NAME,
  verifyInviteSessionToken,
} from "@/lib/inviteSession";
import { prisma } from "@/lib/prisma";

/** The columns any access decision is made from. */
const ACCESS_SELECT = {
  ...ACCOUNT_STANDING_SELECT,
  inviteCodeHash: true,
  joinedByEmail: true,
} as const;

type AccessFields = {
  inviteCodeHash: string | null;
  approvalStatus: string | null;
  disabledAt: Date | null;
  joinedByEmail: string | null;
};

/** What a study route needs to talk to WaniKani on the member's behalf. */
const CONNECTION_SELECT = {
  tokenEncrypted: true,
  tokenIv: true,
  tokenTag: true,
  wkLevel: true,
} as const;

export type StudyAccountRow = {
  tokenEncrypted: string | null;
  tokenIv: string | null;
  tokenTag: string | null;
  wkLevel: number | null;
};

type Requester =
  | { kind: "admin" }
  | { kind: "member"; holdsInvite: boolean; email: string | null };

/**
 * Who is asking, resolved from the request alone.
 *
 * Separated from the row so the decision can be made against an account that
 * was loaded for another purpose, rather than fetching it twice.
 */
async function resolveRequester(request: Request, accountId: string): Promise<Requester> {
  if (await isAuthorizedAdmin(request)) {
    return { kind: "admin" };
  }

  const inviteToken = getCookieValue(request.headers.get("cookie"), INVITE_SESSION_COOKIE_NAME);
  const invitePayload = inviteToken ? verifyInviteSessionToken(inviteToken) : null;

  const session = await getServerSession(authOptions);
  return {
    kind: "member",
    holdsInvite: invitePayload?.accountId === accountId,
    email: session?.user?.email?.trim().toLowerCase() ?? null,
  };
}

/** Whether this requester may act as the account these columns describe. */
function decideAccess(requester: Requester, account: AccessFields | null): boolean {
  if (requester.kind === "admin") {
    return true;
  }
  if (!account || isAccountBarred(account)) {
    return false;
  }
  if (requester.holdsInvite && account.inviteCodeHash) {
    return true;
  }

  const linkedEmail = account.joinedByEmail?.trim().toLowerCase() ?? null;
  return Boolean(requester.email && linkedEmail && linkedEmail === requester.email);
}

/**
 * Whether this request may act as this account.
 *
 * Owning an account is not by itself enough: an account that was turned away,
 * or that an admin has since switched off, is locked out of its own data too,
 * on every path but the admin's. Otherwise being barred only removed someone
 * from the leaderboard while leaving every study, game and tag route open to
 * them.
 *
 * The admin bypass answers without reading anything, because reviewing an
 * account is how a rejection gets reconsidered.
 */
export async function canAccessAccount(request: Request, accountId: string): Promise<boolean> {
  const requester = await resolveRequester(request, accountId);
  if (requester.kind === "admin") {
    return true;
  }

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: ACCESS_SELECT,
  });

  return decideAccess(requester, account);
}

/**
 * The access check and the member's WaniKani connection, in one read.
 *
 * Every polled study route did this in two: `canAccessAccount` fetched the
 * account to decide, then the route fetched the same row again for its token.
 * At a poll every thirty seconds that was two database queries a tab per
 * cycle, and the routes doing it are the busiest in the app - counts and queue
 * are what the study page asks for on a timer, and review is asked once per
 * answer. One query serves both purposes: the columns an access decision needs
 * are three small ones, and adding them to a read the route was making anyway
 * costs nothing.
 *
 * `allowed` and `account` are separate answers on purpose. A permitted request
 * for an account that has since been deleted is a 404, not a 401, and the
 * routes already tell those apart.
 */
export async function loadStudyAccount(
  request: Request,
  accountId: string,
): Promise<{ allowed: boolean; account: StudyAccountRow | null }> {
  const requester = await resolveRequester(request, accountId);

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { ...ACCESS_SELECT, ...CONNECTION_SELECT },
  });

  if (!decideAccess(requester, account)) {
    return { allowed: false, account: null };
  }

  return {
    allowed: true,
    account: account
      ? {
          tokenEncrypted: account.tokenEncrypted,
          tokenIv: account.tokenIv,
          tokenTag: account.tokenTag,
          wkLevel: account.wkLevel,
        }
      : null,
  };
}
