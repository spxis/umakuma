import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const store = readFileSync(join(process.cwd(), "src/lib/cohort/cohortWrite.ts"), "utf8");
const script = readFileSync(join(process.cwd(), "scripts/cohort.ts"), "utf8");

/**
 * A killed run must not leave a member half-written.
 *
 * `playMember` decides what to replay from `Account.lastActivityAt`, and that
 * was written at the very end - after every state, every answer and every
 * game. Kill the process in between and the member had answers on disk but had
 * not advanced, so the next run replayed the same days; `UkReviewAttempt` has
 * no unique key, so every one of those answers was written twice. On a
 * schedule that is not a crash anybody notices - the boards still look fine.
 *
 * Raised by Claude (sim-members) 2026-09-06 while reviewing the cron work, and
 * verified before it was believed: cohortStore.ts had no transaction at all.
 *
 * Asserted over the source, because the failure is an ordering between
 * statements and a test that ran them would have to kill the process midway to
 * see it.
 */
describe("the study write and the resume point are one commit", () => {
  it("wraps the study half in a transaction", () => {
    expect(store).toContain("prisma.$transaction(");
    expect(store).toContain("async (tx) => writeStudy(tx, accountId, member, advanceTo)");
  });

  /* The whole point: the resume point lands with the rows or not at all. */
  it("advances lastActivityAt inside that transaction", () => {
    const body = store.slice(store.indexOf("async function writeStudy("), store.indexOf("export async function saveStanding("));
    expect(body).toContain("advanceTo !== null");
    expect(body).toContain('data: { lastActivityAt: advanceTo }');
  });

  /* Every statement in there has to be on the transaction client, or it
     commits on its own and the guarantee is a comment rather than a fact. */
  it("writes nothing in that transaction on the global client", () => {
    const body = store.slice(store.indexOf("async function writeStudy("), store.indexOf("export async function saveStanding("));
    expect(body).not.toMatch(/await prisma\./);
    for (const write of ["db.ukSrsState.createMany", "db.ukReviewAttempt.createMany", "db.levelTest.createMany", "db.account.update"]) {
      expect(body, write).toContain(write);
    }
  });

  /* Long enough for a first replay - a year of one member is thousands of
     rows - because Prisma's default of five seconds is not. */
  it("gives the transaction room to finish", () => {
    expect(store).toContain("timeout: 120_000");
  });

  /*
   * The boundary, and why it is here rather than around the whole member:
   * `planGameRun` opens a transaction of its own and Prisma does not nest
   * them, so the games cannot join this one. A killed run therefore loses
   * that tick's games, which is a few rows never written rather than answers
   * written twice.
   */
  it("says why the games are outside it", () => {
    expect(store).toContain("Prisma does not nest them");
  });
});

/**
 * A tick replays a bounded amount, so it can finish.
 *
 * A full year-replay of sixteen members ran well past ten minutes against
 * Neon. Inside a request that is a timeout, and a timeout is the thing that
 * half-writes.
 */
describe("how much one run replays", () => {
  it("takes a cap and applies it per member", () => {
    expect(script).toContain("--max-sessions");
    expect(script).toContain("maxSessions === null ? all : all.slice(0, maxSessions)");
  });

  it("replays everything when no cap is given", () => {
    expect(script).toContain("maxSessions: number | null");
    /* Absent means null means uncapped; present is validated like the rest. */
    expect(script).toContain('values.has("--max-sessions") ? wholeAbove("--max-sessions"');
  });

  it("refuses a cap that is not a positive count", () => {
    expect(script).toContain('wholeAbove("--max-sessions"');
    expect(script).toContain("needs a whole number above zero");
  });

  it("says what is left for the next run", () => {
    expect(script).toContain("session(s) left for the next run");
  });
});

/**
 * The command line, read strictly.
 *
 * The count used to be "the first bare number anywhere in the arguments", so
 * `cohort add --window 365 16` read 365 as the count - three hundred and
 * sixty-five members invented onto a leaderboard from a flag's own value.
 * Verified against the real tool before and after: it created 365, and now it
 * creates 16.
 *
 * Asserted over the source, because parseArgs is not exported and the script
 * connects to a database on import. What is pinned is the shape of the fix,
 * which is what a future edit would undo.
 */
describe("reading the command line", () => {
  it("consumes a flag's value with the flag, so it cannot become the count", () => {
    expect(script).toContain("VALUE_FLAGS");
    expect(script).toContain("at += 1;");
    expect(script).toContain("positional.push(token)");
    /* The old rule, which must not come back. */
    expect(script).not.toContain('rest.find((arg) => /^\\d+$/.test(arg))');
  });

  /* `--max-session 5` silently meant "no cap", which is the one setting that
     keeps a run inside the time it has. */
  it("refuses an unknown flag rather than ignoring it", () => {
    expect(script).toContain('Unknown flag "${token}"');
  });

  it("refuses a date it cannot read", () => {
    expect(script).toContain("--until needs a date I can read");
  });

  it("refuses a count or a window that is not a whole number above zero", () => {
    expect(script).toContain("needs a whole number above zero");
    expect(script).toContain('wholeAbove("--window"');
    expect(script).toContain("add needs exactly one count");
  });

  it("tells a stray count on the wrong command what was probably meant", () => {
    expect(script).toContain("takes no count. Did you mean");
  });
});

/**
 * Every command can say what it would do without doing it.
 *
 * `play` against production is the one that matters: tens of thousands of
 * rows, and no way to see the shape of it beforehand.
 */
describe("saying what would happen", () => {
  it.each(["--dry-run"])("offers %s", (flag) => {
    expect(script).toContain(flag);
  });

  it("writes nothing on a dry run of add, remove or play", () => {
    expect(script).toContain("Would create ${invented.length} member(s)");
    expect(script).toContain("Would remove");
    expect(script).toContain("would play ${sessions.length} session(s)");
    /* The play check has to come before anything is simulated. */
    const body = script.slice(script.indexOf("const remaining = all.length"), script.indexOf("const study = await saveStudy"));
    expect(body.indexOf("if (dryRun)")).toBeLessThan(body.indexOf("for (const session of sessions)"));
  });

  it("lists what remove would take before taking it", () => {
    const body = script.slice(script.indexOf("async function remove("), script.indexOf("type PendingGame"));
    expect(body.indexOf("for (const account of accounts)")).toBeLessThan(body.indexOf("await removeCohort()"));
  });
});

/* A member showing "0 game(s)" for weeks is either a quiet persona or a
   broken pool, and the two used to look identical. */
describe("games the planner could not build", () => {
  it("counts them instead of swallowing them", () => {
    expect(script).toContain("skipped += 1");
    expect(script).toContain("game(s) the planner could not build");
  });
});
