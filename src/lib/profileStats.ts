import "server-only";

import { prisma } from "./prisma";
import { GAME_KIND_LABELS } from "@/app/game/GameMode.constants";
import type { GameKind } from "./gameMode";

export type ProfileGameStat = {
  kind: string;
  label: string;
  runs: number;
  bestScore: number;
  bestStreak: number;
  accuracy: number | null;
  lastPlayedAt: string | null;
};

export type ProfileGameSummary = {
  totalRuns: number;
  totalAnswers: number;
  overallAccuracy: number | null;
  byKind: ProfileGameStat[];
};

/**
 * What a member's games say about them, for their profile.
 *
 * Only completed runs count. An abandoned run has a score of zero and an
 * accuracy of nothing, and folding those in would make someone who quits look
 * worse than someone who never played.
 *
 * Accuracy is null rather than zero when nothing was answered: no attempts is
 * not the same as getting everything wrong, and a profile reading "0%" for a
 * game you have never touched is a lie about you.
 */
export async function loadProfileGameStats(accountId: string): Promise<ProfileGameSummary> {
  const runs = await prisma.gameRun.findMany({
    where: { accountId, status: "completed" },
    select: {
      kind: true,
      score: true,
      bestStreak: true,
      answeredCount: true,
      correctCount: true,
      completedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const byKind = new Map<string, ProfileGameStat & { answered: number; correct: number }>();
  let totalAnswers = 0;
  let totalCorrect = 0;

  for (const run of runs) {
    const existing = byKind.get(run.kind) ?? {
      kind: run.kind,
      label: GAME_KIND_LABELS[run.kind as GameKind] ?? run.kind,
      runs: 0,
      bestScore: 0,
      bestStreak: 0,
      accuracy: null,
      lastPlayedAt: null,
      answered: 0,
      correct: 0,
    };

    existing.runs += 1;
    existing.bestScore = Math.max(existing.bestScore, run.score);
    existing.bestStreak = Math.max(existing.bestStreak, run.bestStreak);
    existing.answered += run.answeredCount;
    existing.correct += run.correctCount;

    // Runs arrive newest first, so the first one seen is the most recent.
    const playedAt = (run.completedAt ?? run.createdAt).toISOString();
    if (!existing.lastPlayedAt) {
      existing.lastPlayedAt = playedAt;
    }

    byKind.set(run.kind, existing);
    totalAnswers += run.answeredCount;
    totalCorrect += run.correctCount;
  }

  const stats = [...byKind.values()]
    .map(({ answered, correct, ...stat }) => ({
      ...stat,
      accuracy: answered > 0 ? Math.round((correct / answered) * 100) : null,
    }))
    .sort((left, right) => right.runs - left.runs);

  return {
    totalRuns: runs.length,
    totalAnswers,
    overallAccuracy: totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : null,
    byKind: stats,
  };
}
