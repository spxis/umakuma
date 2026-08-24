import { NextResponse } from "next/server";
import { z } from "zod";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { getVancouverDateKey } from "@/lib/dailySnapshot";
import {
  GAME_DATE_RANGES,
  GAME_CATEGORIES,
  GAME_METRICS,
  calculateGameScore,
  gameDateKeys,
  isGameBatchSize,
  type GameLeaderboardEntry,
  type GameMetric,
} from "@/lib/gameMode";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({
  batchSize: z.coerce.number().int().refine(isGameBatchSize),
  level: z.union([z.literal("any"), z.literal("all"), z.coerce.number().int().min(1).max(60)]),
  category: z.union([z.literal("all"), z.enum(GAME_CATEGORIES)]),
  range: z.enum(GAME_DATE_RANGES),
  metric: z.enum(GAME_METRICS),
});

function isBetter(candidate: GameLeaderboardEntry, current: GameLeaderboardEntry, metric: GameMetric): boolean {
  if (metric === "time") return candidate.durationMs < current.durationMs;
  if (metric === "streak") return candidate.bestStreak > current.bestStreak;
  return candidate.score > current.score || (
    candidate.score === current.score && candidate.durationMs < current.durationMs
  );
}

function sortEntries(entries: GameLeaderboardEntry[], metric: GameMetric): GameLeaderboardEntry[] {
  return [...entries].sort((left, right) => {
    if (metric === "time") return left.durationMs - right.durationMs;
    if (metric === "streak") return right.bestStreak - left.bestStreak;
    return right.score - left.score || left.durationMs - right.durationMs;
  });
}

export async function GET(request: Request, context: { params: Promise<{ accountId: string }> }) {
  return withApiRouteTelemetry({
    route: "/api/game/[accountId]/leaderboard",
    method: "GET",
    request,
    execute: async () => {
      try {
        const url = new URL(request.url);
        const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
        if (!parsed.success) {
          return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
        }
        const { accountId } = await context.params;
        if (!(await canAccessAccount(request, accountId))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const dateKeys = gameDateKeys(parsed.data.range, getVancouverDateKey(new Date()));
        const runSelect = {
          id: true,
          accountId: true,
          batchSize: true,
          level: true,
          category: true,
          durationMs: true,
          bestStreak: true,
          correctCount: true,
          questionCount: true,
          completedAt: true,
          completedDatePst: true,
          account: { select: { nickname: true, wkUsername: true } },
        } as const;
        const [runs, recentRuns] = await Promise.all([
          prisma.gameRun.findMany({
            where: {
              status: "completed",
              batchSize: parsed.data.batchSize,
              level: parsed.data.level === "any"
                ? undefined
                : parsed.data.level === "all"
                  ? null
                  : parsed.data.level,
              category: parsed.data.category === "all" ? undefined : parsed.data.category,
              completedDatePst: { in: dateKeys },
              durationMs: { not: null },
            },
            orderBy: { completedAt: "desc" },
            select: runSelect,
          }),
          prisma.gameRun.findMany({
            where: { status: "completed", durationMs: { not: null } },
            orderBy: { completedAt: "desc" },
            take: 12,
            select: runSelect,
          }),
        ]);

        function toEntry(run: (typeof runs)[number]): GameLeaderboardEntry | null {
          if (run.durationMs === null || !run.completedAt || !run.completedDatePst) return null;
          return {
            runId: run.id,
            accountId: run.accountId,
            nickname: run.account.nickname,
            wkUsername: run.account.wkUsername,
            category: run.category,
            batchSize: run.batchSize as GameLeaderboardEntry["batchSize"],
            level: run.level,
            score: calculateGameScore(run.correctCount, run.questionCount, run.durationMs),
            durationMs: run.durationMs,
            bestStreak: run.bestStreak,
            correctCount: run.correctCount,
            questionCount: run.questionCount,
            completedAt: run.completedAt.toISOString(),
            completedDatePst: run.completedDatePst,
          };
        }

        const bestByDateAndAccount = new Map<string, GameLeaderboardEntry>();
        for (const run of runs) {
          const entry = toEntry(run);
          if (!entry) continue;
          const key = `${entry.completedDatePst}:${entry.accountId}`;
          const current = bestByDateAndAccount.get(key);
          if (!current || isBetter(entry, current, parsed.data.metric)) bestByDateAndAccount.set(key, entry);
        }

        return NextResponse.json({
          days: dateKeys.map((date) => ({
            date,
            entries: sortEntries(
              Array.from(bestByDateAndAccount.values()).filter((entry) => entry.completedDatePst === date),
              parsed.data.metric,
            ),
          })),
          recent: recentRuns.flatMap((run) => {
            const entry = toEntry(run);
            return entry ? [entry] : [];
          }),
        }, { status: 200 });
      } catch (error) {
        console.error("Failed to load game leaderboard", error);
        return NextResponse.json({ error: "Could not load the Game Mode leaderboard." }, { status: 500 });
      }
    },
  });
}
