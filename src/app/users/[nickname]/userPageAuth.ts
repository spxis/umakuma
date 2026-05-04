import { cookies } from "next/headers";

import { INVITE_SESSION_COOKIE_NAME, verifyInviteSessionToken } from "@/lib/inviteSession";
import { prisma } from "@/lib/prisma";
import type { ViewerMenuInfo } from "./UserDashboardTabs.types";

export async function resolveViewerMenuInfo(input: {
  viewerEmail: string | null;
  sessionName: string | null;
}): Promise<ViewerMenuInfo | null> {
  const { viewerEmail, sessionName } = input;

  if (viewerEmail) {
    let viewerAccount = await prisma.account.findFirst({
      where: { joinedByEmail: viewerEmail },
      select: {
        nickname: true,
        wkUsername: true,
      },
    });

    const fallbackNameCandidates = Array.from(
      new Set(
        [
          sessionName?.trim() ?? "",
          sessionName?.trim().split(/\s+/)[0] ?? "",
        ].filter((value) => value.length > 0),
      ),
    );

    if (!viewerAccount && fallbackNameCandidates.length > 0) {
      viewerAccount = await prisma.account.findFirst({
        where: {
          OR: fallbackNameCandidates.map((candidate) => ({
            nickname: {
              equals: candidate,
              mode: "insensitive",
            },
          })),
        },
        select: {
          nickname: true,
          wkUsername: true,
        },
      });
    }

    return {
      provider: "google",
      name: viewerAccount?.nickname ?? sessionName ?? viewerEmail.split("@")[0] ?? "Google user",
      email: viewerEmail,
      wkUsername: viewerAccount?.wkUsername ?? null,
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
  };
}
