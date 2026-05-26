import { getServerSession } from "next-auth";

import { authOptions, isAdminEmail, isGoogleAuthConfigured } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveReadingChallengeId } from "@/lib/readingChallengeStore";

import type { CampaignRecord } from "./AdminCampaignManager.types";
import type { AdminSessionStatus } from "./AdminPage.types";

type ReadingChallengeDelegate = {
  findMany: (args: {
    orderBy: Array<Record<string, "asc" | "desc">>;
    select: Record<string, true>;
  }) => Promise<CampaignRecord[]>;
};

function getReadingChallengeDelegate(): ReadingChallengeDelegate | null {
  return (prisma as unknown as { readingChallenge?: ReadingChallengeDelegate }).readingChallenge ?? null;
}

export async function getAdminWorkspaceInitialSession(): Promise<AdminSessionStatus> {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email ?? null;

  return {
    authorized: isAdminEmail(userEmail),
    googleConfigured: isGoogleAuthConfigured(),
    signedIn: Boolean(userEmail),
    emailAllowed: isAdminEmail(userEmail),
    user: {
      name: session?.user?.name ?? null,
      email: userEmail,
    },
  };
}

export async function getAdminWorkspaceInitialCampaigns(
  initialSession: AdminSessionStatus,
): Promise<CampaignRecord[]> {
  if (!initialSession.authorized) {
    return [];
  }

  const readingChallenge = getReadingChallengeDelegate();
  if (!readingChallenge) {
    return [];
  }

  try {
    await ensureActiveReadingChallengeId();

    const campaigns = await readingChallenge.findMany({
      orderBy: [{ startDatePst: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        status: true,
        currencyCode: true,
        startDatePst: true,
        goalDatePst: true,
        tripDatePst: true,
        targetBaseYen: true,
        scoringRules: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return campaigns;
  } catch {
    return [];
  }
}
