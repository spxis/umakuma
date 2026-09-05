import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { ACTIVE_READING_CHALLENGE } from "@/lib/readingChallengeRules";
import { campaignDaysRemaining, isCampaignDate } from "@/lib/readingSignoff";

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

describe("why it went unnoticed, and why it cannot recur", () => {
  /* The constant is the first challenge and always was: nothing moves it when
     a new campaign starts, so anything reading it answers about a challenge
     that finished. */
  it("still names a campaign that has ended", () => {
    expect(ACTIVE_READING_CHALLENGE.goalDatePst < "2026-09-01").toBe(true);
  });

  /* So the campaign is an argument now and there is nowhere to forget it. A
     function that silently answers about the wrong campaign is worse than no
     function. */
  it("asks which campaign rather than assuming one", () => {
    const winter = { startDatePst: "2026-09-01", goalDatePst: "2026-12-06" };
    expect(isCampaignDate("2026-09-03", winter)).toBe(true);
    expect(isCampaignDate("2026-08-31", winter)).toBe(false);
    expect(isCampaignDate("2026-12-07", winter)).toBe(false);
  });

  it("counts the days left of the campaign it is given", () => {
    const winter = { startDatePst: "2026-09-01", goalDatePst: "2026-12-06" };
    expect(campaignDaysRemaining("2026-12-06", winter.goalDatePst)).toBe(1);
    expect(campaignDaysRemaining("2026-12-07", winter.goalDatePst)).toBe(0);
    expect(campaignDaysRemaining("2026-09-01", winter.goalDatePst)).toBe(97);
    /* It takes the date it needs, not a whole campaign - asking for both
       dates made the home page pass the goal twice to satisfy the type. */
  });

  /* The rule, grepped rather than asserted per file: the constant's dates are
     a last-resort fallback, never the answer. A `??` in front of one is a
     default; anything else is a surface quietly using the wrong campaign. */
  it("leaves no surface reading the constant's dates outright", () => {
    const found = execFileSync(
      "git",
      ["grep", "-n", "-E", String.raw`READING_CAMPAIGN\.(startDatePst|goalDatePst)`, "--", "src"],
      { encoding: "utf8" },
    )
      .split("\n")
      .filter(Boolean)
      .filter((line) => !line.includes(".test."))
      /* The definitions themselves, and the fallbacks that spell out `??`. */
      .filter((line) => !line.startsWith("src/lib/readingSignoff.ts"))
      .filter((line) => !/\?\?\s*READING_CAMPAIGN\./.test(line))
      /* The home page names its fallback on its own line before the try. */
      .filter((line) => !/^src\/app\/page\.tsx:\d+:\s*let challenge/.test(line))
      .filter((line) => !/^src\/app\/users\/\[nickname\]\/UserReadingSignoffPanel\.campaigns\.ts:\d+:\s+(start|goal)DatePst:/.test(line));

    expect(found, `campaign dates read outright:\n${found.join("\n")}`).toEqual([]);
  });
});
