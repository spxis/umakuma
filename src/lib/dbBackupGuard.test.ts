import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const script = readFileSync(join(process.cwd(), "scripts/local-db.mjs"), "utf8");
const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
  scripts: Record<string, string>;
};

/**
 * The database is named in the command, not inferred from the environment.
 *
 * There was one `db:backup`, and it took `DIRECT_URL ?? DATABASE_URL`. A
 * worktree's `.env` points DIRECT_URL at the local container, so running it
 * there with an inline DATABASE_URL for Neon never reached that value: you got
 * 127.0.0.1 and "Backup verified: 43 table(s) with data." This is the command
 * `AGENTS.md` makes mandatory before every irreversible write to production,
 * so it was a safety net that could quietly catch nothing. Found 2026-09-06,
 * one command before a production account was deleted.
 *
 * John's fix: "call them backup-prod and backup-dev." A name cannot be
 * ambiguous the way a precedence rule can.
 */
describe("backing up names its database", () => {
  it("offers one command per database", () => {
    expect(pkg.scripts["db:backup:prod"]).toBe("node scripts/local-db.mjs backup:prod");
    expect(pkg.scripts["db:backup:dev"]).toBe("node scripts/local-db.mjs backup:dev");
  });

  /* Kept only to refuse: it is in older habits, in AGENTS.md's history and in
     every agent's memory, so it must not silently do something. */
  it("keeps the old name as a refusal that points at both", () => {
    expect(script).toContain("no longer guesses which database you mean");
    expect(script).toContain("pnpm db:backup:prod");
    expect(script).toContain("pnpm db:backup:dev");
  });

  /*
   * The half that makes `:prod` usable at all. Production is not in a
   * worktree's environment - its .env is a copy with the two URLs overridden
   * to the container - so the command asks git where the main working tree is
   * and reads the canonical .env beside it. Without this, backing up
   * production from a worktree meant exporting two variables and remembering
   * that DIRECT_URL is the one that wins.
   */
  it("finds production from a worktree rather than asking to be told", () => {
    expect(script).toContain("mainCheckoutEnv");
    expect(script).toContain("--git-common-dir");
    expect(script).toContain("function productionUrl()");
  });

  it("never accepts a local URL as production", () => {
    expect(script).toContain("function isLocalUrl(");
    for (const host of ["localhost", "127.0.0.1", "::1"]) {
      expect(script).toContain(`"${host}"`);
    }
  });

  /* The receipt: printed from the URL handed to pg_dump, so it cannot disagree
     with what was actually dumped. Reading it was the only thing that caught
     the old bug. */
  it("still names the host it dumped", () => {
    expect(script).toContain("Backing up ${new URL(url).hostname}");
  });

  it("refuses rather than dumping nothing when production cannot be found", () => {
    expect(script).toContain("Could not find the production database URL.");
  });
});
