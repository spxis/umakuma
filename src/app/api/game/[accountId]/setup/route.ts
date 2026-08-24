import { NextResponse } from "next/server";

import { canAccessAccount } from "@/lib/accountAccess";
import { withApiRouteTelemetry } from "@/lib/apiRouteTelemetry";
import { GAME_BATCH_SIZES, GAME_CATEGORIES } from "@/lib/gameMode";
import { loadGamePool } from "@/lib/gameModeServer";

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

        return NextResponse.json({
          account,
          batchSizes: GAME_BATCH_SIZES,
          categories: GAME_CATEGORIES,
          levels: Object.keys(countsByLevel).map(Number).sort((left, right) => left - right),
          countsByLevel,
          totalCounts,
        }, { status: 200 });
      } catch (error) {
        console.error("Failed to load game setup", error);
        return NextResponse.json({ error: "Could not load Game Mode." }, { status: 500 });
      }
    },
  });
}
