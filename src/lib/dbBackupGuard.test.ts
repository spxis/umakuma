import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const script = readFileSync(join(process.cwd(), "scripts/local-db.mjs"), "utf8");
/* Just the backup command: `restore` sits above it in the file, so slicing to
   that would give nothing at all - and an empty string passes `not.toContain`
   for every assertion below. */
const start = script.indexOf("  backup(");
const backup = script.slice(start, script.indexOf("psql(args)", start));

/**
 * The backup command must not dump the wrong database quietly.
 *
 * `AGENTS.md` makes this mandatory before every write to production - schema
 * push, seed, backfill, delete - so its whole job is to be the safety net
 * under something irreversible. It used to dump the wrong one and call it
 * success: the target is `DIRECT_URL ?? DATABASE_URL`, and a worktree's .env
 * points DIRECT_URL at the container, so running it there with an inline
 * DATABASE_URL for Neon gives you 127.0.0.1 and "Backup verified: 43 table(s)
 * with data."
 *
 * Found 2026-09-06, one command before a production account was deleted. An
 * agent who trusts the word "verified" is holding a dump of the wrong
 * database and does not know it.
 *
 * Asserted over the script's source: it shells out to pg_dump against a live
 * database, so the behaviour cannot be exercised in a unit test - but the
 * guards either exist in it or they do not.
 */
describe("pnpm db:backup refuses to dump the wrong database", () => {
  it("refuses a local host unless it is asked for", () => {
    expect(backup).toContain("isLocalHost");
    expect(backup).toContain("Refusing to back up");
    expect(backup).toContain('argv.includes("--local")');
  });

  it("treats every spelling of local as local", () => {
    for (const host of ["localhost", "127.0.0.1", "::1"]) {
      expect(backup).toContain(`"${host}"`);
    }
  });

  /* The state a worktree is actually in, and never on purpose. */
  it("refuses when the two variables name different hosts", () => {
    expect(backup).toContain("DIRECT_URL says");
    expect(backup).toContain("DATABASE_URL says");
  });

  /* Reading the printed hostname was the only defence before this, and it is
     still the thing that cannot lie - it comes from the URL handed to pg_dump. */
  it("still names the host it is dumping", () => {
    expect(backup).toContain("Backing up ${new URL(url).hostname}");
  });

  /* Preferring DATABASE_URL instead would only move which variable is the
     trap, so the order is unchanged and the guard is what was added. */
  it("does not silently swap which variable wins", () => {
    expect(backup).toContain("const url = direct ?? pooled;");
  });

  it("tells you both ways out rather than only refusing", () => {
    expect(backup).toContain("pnpm db:backup --local");
    expect(backup).toContain("For production:");
  });
});
