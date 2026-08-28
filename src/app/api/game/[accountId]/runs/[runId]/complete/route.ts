import { NextResponse } from "next/server";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { gameKindRules, type GameKind } from "@/lib/gameMode";
import { completedRunValues, toGameRunSummary } from "@/lib/gameModeServer";
import { prisma } from "@/lib/prisma";

/**
 * Closes a timed run when the clock runs out without another answer.
 *
 * Only kinds that run against a clock may finish this way. Finishing a
 * fixed-length run early would bank a perfect partial score, so those keep
 * completing through the answer route instead.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ accountId: string; runId: string }> },
) {
  return withApiRouteTelemetry({
    route: "/api/game/[accountId]/runs/[runId]/complete",
    method: "POST",
    request,
    execute: async () => {
      try {
        const { accountId, runId } = await context.params;
        if (!(await canAccessAccount(request, accountId))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const outcome = await prisma.$transaction(async (tx) => {
          const run = await tx.gameRun.findUnique({ where: { id: runId } });
          if (!run || run.accountId !== accountId) throw new Error("Game run not found.");
          if (run.status === "completed") return run;
          if (!gameKindRules(run.kind as GameKind).usesTimeLimit) {
            throw new Error("This game cannot be finished early.");
          }

          return tx.gameRun.update({
            where: { id: runId },
            data: {
              questionCount: run.answeredCount,
              ...completedRunValues({
                kind: run.kind as GameKind,
                startedAt: run.startedAt,
                correctCount: run.correctCount,
                questionCount: run.answeredCount,
                bestStreak: run.bestStreak,
                level: run.level,
                timeLimitMs: run.timeLimitMs,
              }),
            },
          });
        });

        return NextResponse.json({ run: toGameRunSummary(outcome) }, { status: 200 });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not finish the game.";
        const expected = /not found|cannot be finished/.test(message);
        if (!expected) console.error("Failed to complete game run", error);
        return NextResponse.json({ error: expected ? message : "Could not finish the game." }, { status: expected ? 409 : 500 });
      }
    },
  });
}
