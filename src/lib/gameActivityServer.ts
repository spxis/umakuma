import "server-only";

import { GameRunStatus } from "@prisma/client";

import {
  GAME_LIVE_WINDOW_MS,
  buildGameActivity,
  type GameActivityByKind,
} from "@/lib/gameActivity";
import { prisma } from "@/lib/prisma";

/**
 * Reads the last completed run for every game, plus any run somebody is in
 * right now.
 *
 * The latest-per-kind half is done with a grouped maximum and then a second
 * lookup, rather than by taking the newest N runs and picking through them:
 * a game nobody has played in months must still report its last result, and a
 * fixed window would silently lose it as the table grows.
 *
 * The name shown is the account nickname. Once display names land this must
 * read the public display name instead — the hub is the wrong place to reveal
 * an account's internal nickname to members outside its group.
 */
export async function loadGameActivity(nowMs: number = Date.now()): Promise<GameActivityByKind> {
  const liveCutoff = new Date(nowMs - GAME_LIVE_WINDOW_MS);

  const [maxima, liveRuns] = await Promise.all([
    prisma.gameRun.groupBy({
      by: ["kind"],
      where: { status: GameRunStatus.completed, completedAt: { not: null } },
      _max: { completedAt: true },
    }),
    prisma.gameRun.findMany({
      where: { status: GameRunStatus.active, updatedAt: { gte: liveCutoff } },
      select: {
        kind: true,
        startedAt: true,
        updatedAt: true,
        account: { select: { nickname: true } },
      },
    }),
  ]);

  const latestFilters = maxima.flatMap((row) =>
    row._max.completedAt ? [{ kind: row.kind, completedAt: row._max.completedAt }] : [],
  );

  const latestRuns =
    latestFilters.length === 0
      ? []
      : await prisma.gameRun.findMany({
          where: { OR: latestFilters },
          select: {
            kind: true,
            score: true,
            correctCount: true,
            questionCount: true,
            completedAt: true,
            account: { select: { nickname: true } },
          },
        });

  return buildGameActivity(
    latestRuns.map((run) => ({
      kind: run.kind,
      playerName: run.account.nickname,
      score: run.score,
      correctCount: run.correctCount,
      questionCount: run.questionCount,
      completedAt: run.completedAt,
    })),
    liveRuns.map((run) => ({
      kind: run.kind,
      playerName: run.account.nickname,
      startedAt: run.startedAt,
      updatedAt: run.updatedAt,
    })),
    nowMs,
  );
}
