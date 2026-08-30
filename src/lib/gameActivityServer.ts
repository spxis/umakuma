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
const LATEST_RUN_SELECT = {
  kind: true,
  accountId: true,
  score: true,
  correctCount: true,
  questionCount: true,
  completedAt: true,
  account: { select: { nickname: true } },
} as const;

/** The most recently completed run per kind, optionally scoped to one account. */
async function latestCompletedPerKind(accountId: string | null) {
  const scope = accountId === null ? {} : { accountId };

  const maxima = await prisma.gameRun.groupBy({
    by: ["kind"],
    where: { ...scope, status: GameRunStatus.completed, completedAt: { not: null } },
    _max: { completedAt: true },
  });

  const filters = maxima.flatMap((row) =>
    row._max.completedAt ? [{ ...scope, kind: row.kind, completedAt: row._max.completedAt }] : [],
  );

  if (filters.length === 0) {
    return [];
  }

  return prisma.gameRun.findMany({ where: { OR: filters }, select: LATEST_RUN_SELECT });
}

export async function loadGameActivity(
  viewerAccountId: string | null = null,
  nowMs: number = Date.now(),
): Promise<GameActivityByKind> {
  const liveCutoff = new Date(nowMs - GAME_LIVE_WINDOW_MS);

  const [latestRuns, viewerRuns, liveRuns] = await Promise.all([
    latestCompletedPerKind(null),
    viewerAccountId === null ? Promise.resolve([]) : latestCompletedPerKind(viewerAccountId),
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

  // The viewer's own latest run is usually not the global latest, so both sets
  // are needed; buildGameActivity takes the maximum per kind across them.
  const completedRows = [...latestRuns, ...viewerRuns].map((run) => ({
    kind: run.kind,
    accountId: run.accountId,
    playerName: run.account.nickname,
    score: run.score,
    correctCount: run.correctCount,
    questionCount: run.questionCount,
    completedAt: run.completedAt,
  }));

  return buildGameActivity(
    completedRows,
    liveRuns.map((run) => ({
      kind: run.kind,
      playerName: run.account.nickname,
      startedAt: run.startedAt,
      updatedAt: run.updatedAt,
    })),
    nowMs,
    viewerAccountId,
  );
}
