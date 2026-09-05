import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/*
 * A review is a review whichever feed it came from. The two routes are
 * different code - one writes UkSrsState, the other posts to WaniKani - so
 * the parity is pinned here rather than shared: both pay through the same
 * helper, and both settle the day after paying.
 */
describe("participation XP is paid on both review feeds", () => {
  const routes = {
    umakuma: readFileSync(path.join(process.cwd(), "src/lib/uk/ukStudyWrite.ts"), "utf8"),
    wanikani: readFileSync(path.join(process.cwd(), "src/app/api/study/[accountId]/review/route.ts"), "utf8"),
    custom: readFileSync(path.join(process.cwd(), "src/app/api/custom-study/[accountId]/review/route.ts"), "utf8"),
  };

  it.each(Object.entries(routes))("%s pays through reviewXpAwards and settles the day", (_name, source) => {
    expect(source).toContain("reviewXpAwards({");
    expect(source).toContain("awardXpQuietly({");
    expect(source).toContain("settleDailyXp({");
  });

  it.each(Object.entries(routes))("%s tells the page what the answer paid", (_name, source) => {
    expect(source).toContain("xpAwarded");
  });
});

describe("the answer says what it paid", () => {
  it("cues the XP even when the stage held", () => {
    const hook = readFileSync(path.join(process.cwd(), "src/app/users/[nickname]/study-explorer/lib/useStudyReviewSubmission.ts"), "utf8");
    expect(hook).toContain("xpAwarded > 0");
    const modal = readFileSync(path.join(process.cwd(), "src/app/users/[nickname]/study-explorer/components/StudyReviewModal.tsx"), "utf8");
    expect(modal).toContain("STUDY_REVIEW_XP_CUE(xp)");
  });
});
