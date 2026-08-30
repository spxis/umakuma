import { GameKind as PrismaGameKind } from "@prisma/client";
import { NextResponse } from "next/server";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { getVancouverDateKey } from "@/lib/dailySnapshot";
import { SUBJECT_TYPES } from "@/lib/domainConstants";
import {
  GAME_BATCH_SIZES,
  GAME_CATEGORIES,
  GAME_KIND_VALUES,
  GAME_PRACTICE_LISTS,
  GAME_TIME_LIMITS_MS,
  type GameCategory,
} from "@/lib/gameMode";
import { resolveDailyLevelCap } from "@/lib/gameModePools";
import { loadGamePool } from "@/lib/gameModeServer";
import { shiritoriHeadKey, shiritoriTailKey } from "@/lib/gameShiritori";
import { prisma } from "@/lib/prisma";
import { fetchStudyTagRows } from "@/lib/studySubjectTags";

function emptyCategoryCounts(): Record<GameCategory, number> {
  return { radical: 0, kanji: 0, vocabulary: 0, mixed: 0 };
}

export async function GET(request: Request, context: { params: Promise<{ accountId: string }> }) {
  return withApiRouteTelemetry({
    route: "/api/game/[accountId]/setup",
    method: "GET",
    request,
    execute: async () => {
      try {
        const { accountId } = await context.params;
        if (!(await canAccessAccount(request, accountId))) {
          return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
        }

        const { account, items } = await loadGamePool(accountId, null, "mixed");
        const countsByLevel: Record<number, Record<string, number>> = {};
        for (const item of items) {
          const counts = countsByLevel[item.level] ?? { radical: 0, kanji: 0, vocabulary: 0, mixed: 0 };
          counts[item.subjectType] += 1;
          counts.mixed += 1;
          countsByLevel[item.level] = counts;
        }
        const totalCounts = items.reduce(
          (counts, item) => ({ ...counts, [item.subjectType]: counts[item.subjectType] + 1, mixed: counts.mixed + 1 }),
          { radical: 0, kanji: 0, vocabulary: 0, mixed: 0 },
        );

        const shiritoriAvailable = items.filter(
          (item) =>
            item.subjectType === SUBJECT_TYPES.vocabulary &&
            Boolean(item.primaryReading) &&
            shiritoriHeadKey(item.primaryReading!) !== null &&
            shiritoriTailKey(item.primaryReading!) !== null,
        ).length;

        const dailyKey = getVancouverDateKey(new Date());
        const [tagRows, dailyRun, dailyLevelCap] = await Promise.all([
          fetchStudyTagRows(accountId),
          prisma.gameRun.findUnique({
            where: { accountId_kind_dailyKey: { accountId, kind: PrismaGameKind.daily, dailyKey } },
            select: { status: true },
          }),
          resolveDailyLevelCap(),
        ]);

        // Practice draws from the started pool, so a tag on an item the player
        // has not unlocked yet is not something they can play.
        const tagBySubjectId = new Map(tagRows.map((row) => [row.subjectId, row]));
        const practiceCounts = {
          [GAME_PRACTICE_LISTS.trouble]: emptyCategoryCounts(),
          [GAME_PRACTICE_LISTS.favorite]: emptyCategoryCounts(),
        };
        for (const item of items) {
          const tags = tagBySubjectId.get(item.subjectId);
          if (!tags) continue;
          for (const list of [GAME_PRACTICE_LISTS.trouble, GAME_PRACTICE_LISTS.favorite] as const) {
            if (!tags[list]) continue;
            practiceCounts[list][item.subjectType] += 1;
            practiceCounts[list].mixed += 1;
          }
        }

        return NextResponse.json({
          account,
          kinds: GAME_KIND_VALUES,
          batchSizes: GAME_BATCH_SIZES,
          timeLimitsMs: GAME_TIME_LIMITS_MS,
          categories: GAME_CATEGORIES,
          levels: Object.keys(countsByLevel).map(Number).sort((left, right) => left - right),
          countsByLevel,
          totalCounts,
          availability: {
            daily: {
              dateKey: dailyKey,
              playedToday: dailyRun?.status === "completed",
              levelCap: dailyLevelCap,
            },
            practice: practiceCounts,
            shiritori: { available: shiritoriAvailable },
          },
        }, { status: 200 });
      } catch (error) {
        console.error("Failed to load game setup", error);
        return NextResponse.json({ error: "Could not load Game Mode." }, { status: 500 });
      }
    },
  });
}
