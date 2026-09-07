import "server-only";

import { GameKind as PrismaGameKind, GameRunStatus } from "@prisma/client";

import {
  GAME_HISTORY_SORTS,
  type GameHistoryPage,
  type GameHistoryQuery,
  type GameHistorySort,
  type GameHistorySortDir,
} from "./gameHistoryQuery";
import type { GameKind } from "./gameMode";
import { toGameRunSummary } from "./gameModeServer";
import { prisma } from "./prisma";

/**
 * One page of a member's game history, read from the database.
 *
 * The vocabulary - sorts, page sizes, the row shape, the query parser - lives
 * in `gameHistoryQuery.ts` because the browsing table needs it in the browser.
 * This half is server-only and is the only part that touches Prisma.
 *
 * **Finished runs only.** An abandoned run is a game somebody walked away from
 * mid-question; it has a score of nothing and answers no question this page is
 * asked. An active one is a game still being played in another tab, and listing
 * it as history would be a lie about a thing that has not happened yet.
 */

/**
 * The database's own ordering for a sort key.
 *
 * Every sort falls back to the finish time, because two runs of the same score
 * or the same XP are otherwise returned in whatever order the planner liked -
 * which makes page 2 disagree with page 1 about what it already showed.
 */
function orderFor(sortBy: GameHistorySort, sortDir: GameHistorySortDir) {
  const played = { completedAt: sortDir };
  if (sortBy === GAME_HISTORY_SORTS.score) return [{ score: sortDir }, played];
  if (sortBy === GAME_HISTORY_SORTS.xp) return [{ xpAwarded: sortDir }, played];
  return [played];
}

export async function getGameHistoryPage(query: GameHistoryQuery): Promise<GameHistoryPage> {
  const accountId = query.accountId ?? "";
  /* `completedAt: { not: null }` as well as the status, because the ordering
     reads that column and a null in it would sort unpredictably against the
     rest. Belt and braces on one index. */
  const scoped = {
    accountId,
    status: GameRunStatus.completed,
    completedAt: { not: null },
  };
  const filtered = { ...scoped, ...(query.kind ? { kind: query.kind as PrismaGameKind } : {}) };

  const [total, runs, kindRows, whole] = await Promise.all([
    prisma.gameRun.count({ where: filtered }),
    prisma.gameRun.findMany({
      where: filtered,
      orderBy: orderFor(query.sortBy, query.sortDir),
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.gameRun.groupBy({ by: ["kind"], where: scoped, _count: true, _sum: { xpAwarded: true } }),
    prisma.gameRun.aggregate({ where: scoped, _count: true, _sum: { xpAwarded: true } }),
  ]);

  const filteredXp = query.kind
    ? (kindRows.find((row) => row.kind === query.kind)?._sum.xpAwarded ?? 0)
    : (whole._sum.xpAwarded ?? 0);

  return {
    rows: runs.map((run) => toGameRunSummary(run)),
    /* Ordered by how much a member has played each game, so the filter opens
       on the ones they actually use rather than on the enum's order. */
    facets: kindRows
      .map((row) => ({
        kind: row.kind as GameKind,
        count: row._count,
        xp: row._sum.xpAwarded ?? 0,
      }))
      .sort((a, b) => b.count - a.count),
    allCount: whole._count,
    allXp: whole._sum.xpAwarded ?? 0,
    filteredXp,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
  };
}
