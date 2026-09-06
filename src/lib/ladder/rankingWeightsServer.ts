import "server-only";

import { prisma } from "@/lib/prisma";

import { parseRankingWeights, type RankingWeights } from "./rankingWeights";

/**
 * The weights, from the one row that holds them.
 *
 * Same shape as `srsScoringRules` and the rest settings: a JSON blob under a
 * known key in `SiteSetting`, parsed with bounds and defaults on the way out
 * and round-tripped through the same parser on the way in, so a hand-edited
 * request is bounded before it is stored rather than only when it is read.
 */
export const RANKING_WEIGHTS_KEY = "leaderboard.rankingWeights";

export async function rankingWeights(): Promise<RankingWeights> {
  const row = await prisma.siteSetting.findUnique({
    where: { key: RANKING_WEIGHTS_KEY },
    select: { value: true },
  });
  return parseRankingWeights(row?.value);
}

export async function saveRankingWeights(weights: RankingWeights): Promise<RankingWeights> {
  const safe = parseRankingWeights(JSON.stringify(weights));
  const value = JSON.stringify(safe);
  await prisma.siteSetting.upsert({
    where: { key: RANKING_WEIGHTS_KEY },
    create: { key: RANKING_WEIGHTS_KEY, value },
    update: { value },
  });
  return safe;
}
