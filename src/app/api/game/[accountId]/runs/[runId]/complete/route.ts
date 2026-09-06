import { NextResponse } from "next/server";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { gameKindRules, type GameKind } from "@/lib/gameMode";
import { completedRunValues, toGameRunSummary } from "@/lib/gameModeServer";
import { prisma } from "@/lib/prisma";
import { settleDailyXp } from "@/lib/xp/xpDayServer";
import { settleGameXp } from "@/lib/xp/xpGameServer";
import type { XpEarned } from "@/lib/xp/xpToast";
import { XP_REASONS } from "@/lib/xp/xpStudyAwards";

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
          if (run.status === "completed") return { run, completedNow: false };
          if (!gameKindRules(run.kind as GameKind).usesTimeLimit) {
            throw new Error("This game cannot be finished early.");
          }

          const closed = await tx.gameRun.update({
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
                accumulatedScore: run.score,
              }),
            },
          });
          return { run: closed, completedNow: true };
        });

        /* Only the run that this request actually closed. A replayed request
           finds the run already complete and must not pay for it twice. */
        const earned: XpEarned = [];
        /* What closing the run paid, for the summary sent back with it: the
           run row was read before the XP was settled onto it. */
        let settledXp: { xpAwarded: number; xpSkipped: string | null } | null = null;
        if (outcome.completedNow) {
          const game = await settleGameXp({
            accountId,
            run: {
              id: runId,
              kind: outcome.run.kind as GameKind,
              questionCount: outcome.run.questionCount,
              correctCount: outcome.run.correctCount,
              score: outcome.run.score,
            },
          });
          settledXp = { xpAwarded: game.awarded, xpSkipped: game.skipped };
          /* And what the day has become because of it: the sign-in, a streak
             milestone, the "a lesson and a game" quest. Swallows its own
             failures, like the award above it. */
          const dayXp = await settleDailyXp({ accountId });
          earned.push(...game.earned);
          if (dayXp > 0) earned.push({ xp: dayXp, reason: XP_REASONS.today });
        }

        return NextResponse.json(
          { run: toGameRunSummary({ ...outcome.run, ...(settledXp ?? {}) }), xpEarned: earned },
          { status: 200 },
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not finish the game.";
        const expected = /not found|cannot be finished/.test(message);
        if (!expected) console.error("Failed to complete game run", error);
        return NextResponse.json({ error: expected ? message : "Could not finish the game." }, { status: expected ? 409 : 500 });
      }
    },
  });
}
