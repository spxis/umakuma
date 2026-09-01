import { ACTIVE_READING_CHALLENGE } from "@/lib/readingChallengeRules";
import { READING_CAMPAIGN } from "@/lib/readingSignoff";

import type { ReadingCampaignOption } from "./UserReadingSignoffPanel.types";

export function resolveReadingCampaignOptions(
  campaigns: ReadingCampaignOption[] | undefined,
  fallbackCampaignId: string,
): ReadingCampaignOption[] {
  if (campaigns?.length) {
    return campaigns.map((campaign) => ({
      ...campaign,
      tripDatePst: campaign.tripDatePst ?? ACTIVE_READING_CHALLENGE.tripDatePst,
      targetBaseYen: campaign.targetBaseYen ?? ACTIVE_READING_CHALLENGE.targetBaseYen,
    }));
  }

  return [
    {
      id: fallbackCampaignId,
      name: ACTIVE_READING_CHALLENGE.name,
      status: ACTIVE_READING_CHALLENGE.status,
      startDatePst: READING_CAMPAIGN.startDatePst,
      goalDatePst: READING_CAMPAIGN.goalDatePst,
      tripDatePst: ACTIVE_READING_CHALLENGE.tripDatePst,
      targetBaseYen: ACTIVE_READING_CHALLENGE.targetBaseYen,
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
  /*
   * A choice the member has made, that names a campaign that exists, wins.
   *
   * The server's answer used to win unconditionally, which made the Campaign
   * selector inert: picking the other campaign set the state, changed the SWR
   * key and started a refetch - but SWR keeps the previous response while the
   * new one is in flight, and that stale response still carried the old
   * `selectedChallengeId`. This ran on the very next render, read the old id
   * back off it, and put the selection where it had been. The select snapped
   * back before anyone saw it move, so a member with two campaigns could only
   * ever look at the first.
   *
   * The server value is still what seeds the choice and what rescues it when
   * the campaign it names has gone - it just no longer overrules a live one.
   */
  if (campaigns.some((campaign) => campaign.id === currentCampaignId)) {
    return currentCampaignId;
  }

  if (serverCampaignId) {
    return serverCampaignId;
  }

  return campaigns[0]?.id ?? currentCampaignId;
}

export function resolveCampaignMonthBounds(args: {
  campaigns?: ReadingCampaignOption[];
  selectedCampaignId: string;
}): { startMonthKey: string; goalMonthKey: string } {
  const selectedCampaign = args.campaigns?.find((campaign) => campaign.id === args.selectedCampaignId) ?? null;
  const startDatePst = selectedCampaign?.startDatePst ?? READING_CAMPAIGN.startDatePst;
  const goalDatePst = selectedCampaign?.goalDatePst ?? READING_CAMPAIGN.goalDatePst;

  return {
    startMonthKey: startDatePst.slice(0, 7),
    goalMonthKey: goalDatePst.slice(0, 7),
  };
}

export function clampMonthKeyToBounds(
  monthKey: string,
  bounds: { startMonthKey: string; goalMonthKey: string },
): string {
  return monthKey < bounds.startMonthKey
    ? bounds.startMonthKey
    : monthKey > bounds.goalMonthKey
      ? bounds.goalMonthKey
      : monthKey;
}
