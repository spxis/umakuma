import { describe, expect, it } from "vitest";

import {
  clampMonthKeyToBounds,
  resolveCampaignMonthBounds,
  resolveReadingCampaignOptions,
  resolveSelectedReadingCampaignId,
} from "./UserReadingSignoffPanel.campaigns";

describe("UserReadingSignoffPanel campaign helpers", () => {
  it("falls back to default challenge campaign option", () => {
    const campaigns = resolveReadingCampaignOptions(undefined, "fallback-id");

    expect(campaigns).toHaveLength(1);
    expect(campaigns[0]?.id).toBe("fallback-id");
  });

  it("keeps the campaign the member chose, even while the server still names the old one", () => {
    const campaigns = [
      {
        id: "campaign-a",
        name: "Campaign A",
        status: "active",
        startDatePst: "2026-06-01",
        goalDatePst: "2026-07-01",
      },
      {
        id: "campaign-b",
        name: "Campaign B",
        status: "draft",
        startDatePst: "2026-08-01",
        goalDatePst: "2026-09-01",
      },
    ];

    /*
     * This asserted the opposite - that the server's id wins - and that was
     * what made the Campaign selector inert. Choosing a campaign changes the
     * SWR key, but SWR serves the previous response while the new one is in
     * flight, and that stale response still names the campaign being left. The
     * server winning meant the selection was put back before it took effect.
     */
    const selected = resolveSelectedReadingCampaignId({
      currentCampaignId: "campaign-a",
      serverCampaignId: "campaign-b",
      campaigns,
    });

    expect(selected).toBe("campaign-a");
  });

  /* The server still decides when the member has no usable choice of their own. */
  it("takes the server campaign when the current one is not a real campaign", () => {
    const campaigns = [
      {
        id: "campaign-a",
        name: "Campaign A",
        status: "active",
        startDatePst: "2026-06-01",
        goalDatePst: "2026-07-01",
      },
    ];

    expect(
      resolveSelectedReadingCampaignId({
        currentCampaignId: "campaign-that-was-deleted",
        serverCampaignId: "campaign-a",
        campaigns,
      }),
    ).toBe("campaign-a");
  });

  /* And falls back to the first campaign when there is no server answer either. */
  it("falls back to the first campaign when nothing else names one", () => {
    const campaigns = [
      {
        id: "campaign-a",
        name: "Campaign A",
        status: "active",
        startDatePst: "2026-06-01",
        goalDatePst: "2026-07-01",
      },
    ];

    expect(
      resolveSelectedReadingCampaignId({ currentCampaignId: "gone", campaigns }),
    ).toBe("campaign-a");
  });

  it("resolves month bounds from selected campaign", () => {
    const bounds = resolveCampaignMonthBounds({
      selectedCampaignId: "campaign-b",
      campaigns: [
        {
          id: "campaign-a",
          name: "Campaign A",
          status: "active",
          startDatePst: "2026-06-01",
          goalDatePst: "2026-07-01",
        },
        {
          id: "campaign-b",
          name: "Campaign B",
          status: "draft",
          startDatePst: "2026-09-10",
          goalDatePst: "2026-11-08",
        },
      ],
    });

    expect(bounds).toEqual({
      startMonthKey: "2026-09",
      goalMonthKey: "2026-11",
    });
  });

  it("clamps month keys to campaign bounds", () => {
    const bounds = {
      startMonthKey: "2026-06",
      goalMonthKey: "2026-08",
    };

    expect(clampMonthKeyToBounds("2026-05", bounds)).toBe("2026-06");
    expect(clampMonthKeyToBounds("2026-07", bounds)).toBe("2026-07");
    expect(clampMonthKeyToBounds("2026-09", bounds)).toBe("2026-08");
  });
});
