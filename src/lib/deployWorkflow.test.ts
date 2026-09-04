import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const WORKFLOW = readFileSync(
  join(process.cwd(), ".github/workflows/vercel-deploy.yml"),
  "utf8",
);

/**
 * The deploy path, held to the two rules that make it safe.
 *
 * On 2026-09-03 the upload threw "fetch failed" at 59MB of 79MB. The commit
 * was on main, CI was green, and production simply stayed on older code -
 * there was nothing to retry it, and it only got out because another agent
 * pushed minutes later. Because the newest run is the one that matters, a
 * flake on the last push of a burst is exactly the case nothing else carries.
 *
 * The retry and the cancellation are one design, not two. A superseded run is
 * killed the moment the next starts, which is the only reason a retry cannot
 * finish late and re-alias production to an older commit. Asserting them
 * together is the point: whichever of the two somebody removes, this fails.
 */
describe("the production deploy", () => {
  it("retries the upload, which is the step with no second chance", () => {
    const upload = WORKFLOW.slice(WORKFLOW.indexOf("Deploy prebuilt output to production"));
    expect(upload).toMatch(/for attempt in/);
    expect(upload).toMatch(/vercel deploy --prebuilt/);
  });

  /*
   * Without this the retry becomes the bug it was meant to prevent: run A's
   * late retry would point production back at A after B had already shipped.
   */
  it("still cancels a superseded run, which is what makes the retry safe", () => {
    expect(WORKFLOW).toMatch(/group:\s*vercel-production/);
    expect(WORKFLOW).toMatch(/cancel-in-progress:\s*true/);
  });

  /* A gate that retries is not a gate. */
  it("leaves the schema drift check single-shot", () => {
    const start = WORKFLOW.indexOf("Check production schema drift");
    const drift = WORKFLOW.slice(start, WORKFLOW.indexOf("- name:", start + 10));
    expect(drift).not.toMatch(/for attempt in/);
    expect(drift).toMatch(/--exit-code/);
  });

  /*
   * The audit asks the registry a question and twice got a socket timeout
   * three times running. A timeout is no answer, not a finding; a real
   * vulnerability fails every attempt identically, so the gate is unchanged.
   */
  it("retries the audit, which asks the network a question", () => {
    const start = WORKFLOW.indexOf("Audit production dependencies");
    const audit = WORKFLOW.slice(start, WORKFLOW.indexOf("- name:", start + 10));
    expect(audit).toMatch(/for attempt in/);
    expect(audit).toMatch(/pnpm security:check/);
    expect(audit).toMatch(/::error::Audit failed three times/);
  });

  /* Three tries and it is not the network. Say so rather than retry forever. */
  it("gives up rather than looping, and says the failure is real", () => {
    expect(WORKFLOW).toMatch(/::error::Deploy failed three times/);
    /* Exactly the two network calls, and nothing else, get a second chance. */
    expect(WORKFLOW.match(/for attempt in 1 2 3/g)).toHaveLength(2);
  });
});
