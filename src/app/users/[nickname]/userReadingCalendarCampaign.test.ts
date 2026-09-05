import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { ACTIVE_READING_CHALLENGE } from "@/lib/readingChallengeRules";
import { isCampaignDate } from "@/lib/readingSignoff";

const CALENDAR = "src/app/users/[nickname]/UserReadingCalendar.tsx";
const PANEL = "src/app/users/[nickname]/UserReadingSignoffPanel.tsx";

describe("the calendar follows the campaign that is selected", () => {
  const calendar = readFileSync(CALENDAR, "utf8");

  /* John: "Kids can't checkin. Button isn't available perhaps?" It was not.
     The page has had a campaign selector for a while and the calendar was
     still asking a constant that names the *first* challenge, so every day of
     the one being looked at fell outside "the campaign" and the check-in
     button was never drawn - for anybody, child or admin. */
  it("gates the check-in on the selected campaign, not a constant", () => {
    expect(calendar).toContain("key >= campaignStartDatePst && key <= campaignGoalDatePst");
    expect(calendar).not.toContain("isCampaignDate(");
    expect(calendar).not.toContain("READING_CAMPAIGN.");
  });

  /* The same constant bounded the month arrows, which is why Next was greyed
     out from the first day of a campaign that starts after the old one ended. */
  it("bounds the month arrows on the selected campaign too", () => {
    expect(calendar).toContain("campaignStartDatePst.slice(0, 7)");
    expect(calendar).toContain("campaignGoalDatePst.slice(0, 7)");
  });

  it("is handed the dates the page already resolved", () => {
    const panel = readFileSync(PANEL, "utf8");
    expect(panel).toContain("campaignStartDatePst={selectedCampaignStartDatePst}");
    expect(panel).toContain("campaignGoalDatePst={selectedCampaignGoalDatePst}");
  });
});

describe("why it went unnoticed", () => {
  /* The constant is the first challenge and always was. Nothing updates it
     when a new campaign starts, so anything still reading it is answering
     about a challenge that finished. */
  it("still names a campaign that has ended", () => {
    expect(ACTIVE_READING_CHALLENGE.goalDatePst < "2026-09-01").toBe(true);
    expect(isCampaignDate("2026-09-03")).toBe(false);
  });
});
