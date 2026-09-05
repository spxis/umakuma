import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const SERVER = readFileSync("src/lib/uk/ukLevelTestServer.ts", "utf8");

/**
 * What a level test must hold onto, pinned to the source: the logic is all
 * Prisma and the games' own machinery, so these assert the properties rather
 * than the mechanics, which `ukGates.test.ts` already covers.
 */
describe("sitting a level test", () => {
  it("is a game run of the level_test kind, on our ladder", () => {
    /* The board, scoring and answer route are the games' own - nothing about
       answering a test is new code. */
    expect(SERVER).toContain("kind: GAME_KINDS.levelTest");
    expect(SERVER).toContain("ladder: GAME_LADDERS.umakuma");
  });

  it("records the curriculum version it was sat on", () => {
    /* A pass is a claim about a curriculum. If the ladder moves, a pass on
       1.2 should still say what it was a pass of. */
    expect(SERVER).toContain("curriculumVersion: CURRICULUM_VERSION");
  });

  it("takes the score from the run, never from a request", () => {
    expect(SERVER).toContain("select: { correctCount: true, questionCount: true, status: true }");
    const finalize = SERVER.slice(SERVER.indexOf("export async function finalizeLevelTest"));
    expect(finalize).not.toContain("request.json");
  });


  it("gives a final four tiles and a checkpoint three", () => {
    /* Guessing must not pay on a test that certifies a JLPT level; a
       checkpoint is practice. */
    expect(SERVER).toContain("jlpt_final: 4, checkpoint: 3");
  });

  it("is idempotent once finished", () => {
    expect(SERVER).toContain("const verdict = test.verdict ?? testVerdict(");
    expect(SERVER).toContain("if (!test.verdict) {");
  });
});

describe("a level test is a run the runner plays, not a game", () => {
  const route = (rel: string) => readFileSync(path.join(process.cwd(), "src/app/api/game/[accountId]", rel), "utf8");

  it("starts only from the gate the server derives - the body cannot choose what is tested", () => {
    const runs = route("runs/route.ts");
    expect(runs).toContain("parsed.data.kind === GAME_KINDS.levelTest");
    expect(runs).toContain("pendingGate(accountId)");
    expect(runs).toContain("startLevelTest(accountId, gate)");
  });

  it("is graded on its last answer instead of being paid as a game", () => {
    const answer = route("runs/[runId]/answer/route.ts");
    expect(answer).toContain("pendingKind === GAME_KINDS.levelTest");
    expect(answer).toContain("finalizeLevelTestForRun(accountId, runId)");
  });

  it("never appears on the overall scoreboard", () => {
    const board = route("leaderboard/route.ts");
    expect(board).toContain("{ not: GAME_KINDS.levelTest }");
  });
});

describe("a gate is sat once", () => {
  it("stops offering a gate the record says has been passed or written", () => {
    const source = readFileSync(path.join(process.cwd(), "src/lib/uk/ukLevelTestServer.ts"), "utf8");
    const pending = source.slice(source.indexOf("export async function pendingGate"));
    expect(pending).toContain("gateKey: gate.gateKey");
    expect(pending).toMatch(/verdict: gate\.mustPass \? \{ in: \["solid", "passed"\] \} : \{ not: null \}/);
    expect(pending).toContain("return sat ? null : gate;");
  });
});
