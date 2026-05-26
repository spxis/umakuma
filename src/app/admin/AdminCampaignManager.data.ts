import type { ReadingChallengeDefinition } from "@/lib/readingChallengeRules";

import { parseScoringRules } from "./AdminCampaignManager.lib";
import type { CampaignForm, CampaignRecord, CampaignsResponse } from "./AdminCampaignManager.types";

export const CAMPAIGN_AUTH_REQUIRED_MESSAGE = "Sign in with an allowlisted Google account to load campaigns.";

async function readApiErrorMessage(response: Response, fallbackMessage: string): Promise<string> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error?.trim()) {
        return payload.error;
      }
    } catch {
      return fallbackMessage;
    }
  }

  try {
    const rawText = (await response.text()).trim();
    return rawText.length > 0 ? rawText : fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

export async function fetchCampaigns(): Promise<CampaignRecord[]> {
  const response = await fetch("/api/admin/reading-campaigns", { cache: "no-store" });

  if (!response.ok) {
    const fallbackMessage = response.status === 401
      ? CAMPAIGN_AUTH_REQUIRED_MESSAGE
      : "Could not fetch campaigns.";
    throw new Error(await readApiErrorMessage(response, fallbackMessage));
  }

  const payload = (await response.json()) as CampaignsResponse;
  if (!Array.isArray(payload.campaigns)) {
    throw new Error("Campaign response was invalid.");
  }

  return payload.campaigns;
}

export function parseSimulationChallenge(form: CampaignForm, selectedCampaignId: string): ReadingChallengeDefinition | null {
  if (form.name.trim().length < 2 || form.slug.trim().length < 2) {
    return null;
  }

  try {
    const scoringRules = parseScoringRules(form.scoringRulesText);

    return {
      id: selectedCampaignId || form.id.trim() || "campaign-preview",
      slug: form.slug,
      name: form.name,
      description: form.description,
      status: form.status,
      currencyCode: "JPY",
      startDatePst: form.startDatePst,
      goalDatePst: form.goalDatePst,
      tripDatePst: form.tripDatePst,
      targetBaseYen: form.targetBaseYen,
      scoringRules: scoringRules as ReadingChallengeDefinition["scoringRules"],
    };
  } catch {
    return null;
  }
}
