import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/**
 * The rules an edit has to survive, asserted on the source rather than a live
 * database: the semantics themselves are covered by `ladderOps.test.ts`, and
 * what matters here is that the server keeps the two stores in step.
 */
const SOURCE = readFileSync("src/lib/ladder/ladderOpsServer.ts", "utf8");

describe("recording and withdrawing a ladder edit", () => {
  it("checks a candidate against the pending ops, not the bare ladder", () => {
    /* Two moves out of the same level can each be legal alone and empty it
       together, so the candidate is replayed on top of what is already queued. */
    expect(SOURCE).toContain("const pending = await pendingLadderOps();");
    expect(SOURCE).toContain("applyLadderOps(replayed.levels, [candidate])");
  });

  it("writes the op and the live level in one transaction", () => {
    /* Either both happen or neither. A logged op whose item did not move is a
       lie in the audit trail; a moved item with no op is drift. */
    expect(SOURCE).toContain("prisma.$transaction([\n    prisma.ladderOverride.create(");
  });

  it("puts the item back when an edit is withdrawn", () => {
    /* The bug this pins: deleting the op alone left the database saying level
       9 and the committed ladder saying 10, with nothing recording why. */
    const withdraw = SOURCE.slice(SOURCE.indexOf("export async function deleteLadderOp"));
    expect(withdraw).toContain("data: { level: row.fromLevel }");
    expect(withdraw).toContain("prisma.$transaction([prisma.ladderOverride.delete(");
  });

  it("restores a removed item rather than leaving it retired", () => {
    const withdraw = SOURCE.slice(SOURCE.indexOf("export async function deleteLadderOp"));
    expect(withdraw).toContain("data: { removedAt: null }");
  });

  it("refuses to withdraw an op that has already been exported", () => {
    /* It is in the committed file by then and the build replays it from there;
       removing the row would leave the two disagreeing. */
    expect(SOURCE).toContain("if (!row || row.exportedAt !== null) return false;");
  });

  it("replays only kanji ops, since only those reshape the levels", () => {
    expect(SOURCE).toContain('.filter((row) => row.kind === "kanji")');
  });
});
