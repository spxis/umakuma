import { getServerSession } from "next-auth";

import { authOptions, isAdminEmail, isGoogleAuthConfigured } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveReadingChallengeId } from "@/lib/readingChallengeStore";
import { resolveViewerMenuInfo } from "@/app/users/[nickname]/userPageAuth";

import type { CampaignRecord } from "./AdminCampaignManager.types";
import type { AdminSessionStatus } from "./AdminPage.types";

function getReadingChallengeDelegate(): typeof prisma.readingChallenge | null {
  return prisma.readingChallenge;
}

export async function getAdminWorkspaceInitialSession(): Promise<AdminSessionStatus> {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email ?? null;
  const viewerMenuInfo = await resolveViewerMenuInfo({
    viewerEmail: userEmail,
    sessionName: session?.user?.name ?? null,
  });

  return {
    authorized: isAdminEmail(userEmail),
    googleConfigured: isGoogleAuthConfigured(),
    signedIn: Boolean(userEmail),
    emailAllowed: isAdminEmail(userEmail),
    user: {
      name: viewerMenuInfo?.name ?? session?.user?.name ?? null,
      email: userEmail,
      wkUsername: viewerMenuInfo?.wkUsername ?? null,
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

    return campaigns.map((campaign) => ({
      ...campaign,
      currencyCode: "JPY",
      scoringRules: campaign.scoringRules as Record<string, unknown>,
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString(),
    }));
  } catch {
    return [];
  }
}
