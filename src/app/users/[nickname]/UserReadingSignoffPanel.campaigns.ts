import { ACTIVE_READING_CHALLENGE } from "@/lib/readingChallengeRules";
import { READING_CAMPAIGN } from "@/lib/readingSignoff";

import type { ReadingCampaignOption } from "./UserReadingSignoffPanel.types";

export function resolveReadingCampaignOptions(
  campaigns: ReadingCampaignOption[] | undefined,
  fallbackCampaignId: string,
): ReadingCampaignOption[] {
  if (campaigns?.length) {
    return campaigns;
  }

  return [
    {
      id: fallbackCampaignId,
      name: ACTIVE_READING_CHALLENGE.name,
      status: ACTIVE_READING_CHALLENGE.status,
      startDatePst: READING_CAMPAIGN.startDatePst,
      goalDatePst: READING_CAMPAIGN.goalDatePst,
    },
  ];
}

export function resolveSelectedReadingCampaignId({
  currentCampaignId,
  serverCampaignId,
  campaigns,
}: {
  currentCampaignId: string;
  serverCampaignId?: string;
  campaigns: ReadingCampaignOption[];
}): string {
  if (serverCampaignId) {
    return serverCampaignId;
  }

  if (campaigns.some((campaign) => campaign.id === currentCampaignId)) {
    return currentCampaignId;
  }

  return campaigns[0]?.id ?? currentCampaignId;
}
