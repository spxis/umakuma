import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/**
 * AGENTS.md belongs to us, not to the framework.
 *
 * Next 16.3 generates its own AGENTS.md and CLAUDE.md on every dev run
 * unless `agentRules` is off. Here those files are the rules an agent is
 * working under rather than a pointer to somebody else's, so a regenerated
 * block is the framework editing the instructions mid-session - and it
 * arrives as an unexplained dirty file that the release chain's `git add -A`
 * will happily commit.
 *
 * Read as text rather than imported: the config is ESM with a `satisfies`
 * clause and importing it into vitest drags the whole Next config pipeline
 * in for one boolean.
 */
describe("next.config.ts", () => {
  it("refuses the generated agent rules", () => {
    const config = readFileSync("next.config.ts", "utf8");

    expect(config).toMatch(/agentRules:\s*false/);
  });
});
