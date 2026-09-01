import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { NEON_AUTOSUSPEND_MS, STUDY_POLL_INTERVAL_MS } from "./pollIntervals";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const POLLING_FILES = [
  "src/app/users/[nickname]/useStudySourceState.ts",
  "src/app/users/[nickname]/study-explorer/components/StudyExplorer.tsx",
];

/*
 * What the study pages cost while nobody is doing anything.
 *
 * Both surfaces polled every thirty seconds. One open tab was 120 serverless
 * invocations an hour and about 240 database queries, because each request
 * checks access and then reads the account again. An evening across the family
 * ran to thousands of both, and none of it discovered anything: review counts
 * move on WaniKani's SRS schedule, and the queue is mutated locally as a member
 * answers rather than found by asking again.
 */
describe("how often the study surfaces poll", () => {
  /*
   * The one that actually shows up on the bill. Neon suspends its compute
   * after five minutes idle and charges for the time it is awake, so a poll
   * inside that window means the database never sleeps while any tab is open.
   */
  it("polls slowly enough for the database to suspend", () => {
    expect(STUDY_POLL_INTERVAL_MS).toBeGreaterThanOrEqual(NEON_AUTOSUSPEND_MS);
  });

  it("still polls, because a session left open should catch up eventually", () => {
    // An hour would be a different decision; this is a safety net, not a nap.
    expect(STUDY_POLL_INTERVAL_MS).toBeLessThanOrEqual(900_000);
  });

  it.each(POLLING_FILES)("%s takes its interval from the shared constant", (path) => {
    const source = read(path);
    expect(source).toContain("STUDY_POLL_INTERVAL_MS");
    /*
     * No literal intervals beside it. The number matters for a reason that is
     * written down in one place, and a hand-typed 30_000 here would undo it
     * without anybody noticing.
     */
    expect(source).not.toMatch(/refreshInterval:\s*\d/);
  });

  /*
   * Coming back to the tab has to still feel instant, or the slower poll turns
   * into something a member waits on rather than something they never see.
   */
  it.each(POLLING_FILES)("%s still refreshes when the tab regains focus", (path) => {
    expect(read(path)).toContain("revalidateOnFocus");
  });
});
