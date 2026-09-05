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
  };

  it.each(Object.entries(routes))("%s pays through reviewXpAwards and settles the day", (_name, source) => {
    expect(source).toContain("reviewXpAwards({");
    expect(source).toContain("awardXpQuietly({");
    expect(source).toContain("settleDailyXp({");
  });
});
