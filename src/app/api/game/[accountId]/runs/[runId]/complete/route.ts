import { NextResponse } from "next/server";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { gameKindRules, type GameKind } from "@/lib/gameMode";
import { completedRunValues, toGameRunSummary } from "@/lib/gameModeServer";
import { prisma } from "@/lib/prisma";
import { settleDailyXp } from "@/lib/xp/xpDayServer";
import { awardXpQuietly } from "@/lib/xp/xpServer";
import type { XpEarned } from "@/lib/xp/xpToast";
import { GAME_XP_REASONS, gameXpAwards } from "@/lib/xp/xpStudyAwards";

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
        if (outcome.completedNow) {
          const gameXp = await awardXpQuietly({ accountId, requests: gameXpAwards() });
          /* And what the day has become because of it: the sign-in, a streak
             milestone, the "a lesson and a game" quest. Swallows its own
             failures, like the award above it. */
          const dayXp = await settleDailyXp({ accountId });
          if (gameXp > 0) earned.push({ xp: gameXp, reason: GAME_XP_REASONS.finished });
          if (dayXp > 0) earned.push({ xp: dayXp, reason: GAME_XP_REASONS.today });
        }

        return NextResponse.json({ run: toGameRunSummary(outcome.run), xpEarned: earned }, { status: 200 });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not finish the game.";
        const expected = /not found|cannot be finished/.test(message);
        if (!expected) console.error("Failed to complete game run", error);
        return NextResponse.json({ error: expected ? message : "Could not finish the game." }, { status: expected ? 409 : 500 });
      }
    },
  });
}
