import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type LeaderboardRow = {
  id: string;
  nickname: string;
  wkUsername: string;
  wkLevel: number;
  reviewCount: number;
  burnedCount: number;
  pendingReviews: number;
  radicalCount: number;
  vocabularyCount: number;
  apprenticeCount: number;
  guruCount: number;
  masterCount: number;
  enlightenedCount: number;
  levelKanjiTotal: number;
  levelKanjiLearned: number;
  levelKanjiGuruPlus: number;
  levelKanjiLocked: number;
  itemSpread: unknown;
  jlptCounts: unknown;
  lastActivityAt: Date | null;
  lastRadicalGuruedAt: Date | null;
  lastKanjiGuruedAt: Date | null;
  lastVocabularyGuruedAt: Date | null;
  lastRadicalGuruedItem: unknown;
  lastKanjiGuruedItem: unknown;
  lastVocabularyGuruedItem: unknown;
  score: number;
  lastSyncedAt: Date;
  dailyDelta?: {
    score: number;
    reviewCount: number;
    wkLevel: number;
    radicalCount: number;
    vocabularyCount: number;
    burnedCount: number;
    levelKanjiLearned: number;
  } | null;
};

type DailyDeltaSnapshot = {
  accountId: string;
  score: number;
  reviewCount: number;
  wkLevel: number;
  radicalCount: number;
  vocabularyCount: number;
  burnedCount: number;
  levelKanjiLearned: number;
};

type ReadingChallengeMemberDelegate = {
  findMany: (args: {
    where?: Record<string, unknown>;
    select: { accountId: true; tracked: true };
  }) => Promise<Array<{ accountId: string; tracked: boolean }>>;
};

function getReadingChallengeMemberDelegate(): ReadingChallengeMemberDelegate | null {
  const delegate = (prisma as unknown as { readingChallengeMember?: ReadingChallengeMemberDelegate })
    .readingChallengeMember;
  return delegate ?? null;
}

export function loadLeaderboardRows(): Promise<LeaderboardRow[]> {
  return prisma.account.findMany({
    orderBy: [{ score: "desc" }, { wkLevel: "desc" }, { reviewCount: "desc" }],
    select: {
      id: true,
      nickname: true,
      wkUsername: true,
      wkLevel: true,
      reviewCount: true,
      burnedCount: true,
      pendingReviews: true,
      radicalCount: true,
      vocabularyCount: true,
      apprenticeCount: true,
      guruCount: true,
      masterCount: true,
      enlightenedCount: true,
      levelKanjiTotal: true,
      levelKanjiLearned: true,
      levelKanjiGuruPlus: true,
      levelKanjiLocked: true,
      itemSpread: true,
      jlptCounts: true,
      lastActivityAt: true,
      lastRadicalGuruedAt: true,
      lastKanjiGuruedAt: true,
      lastVocabularyGuruedAt: true,
      lastRadicalGuruedItem: true,
      lastKanjiGuruedItem: true,
      lastVocabularyGuruedItem: true,
      score: true,
      lastSyncedAt: true,
    },
  });
}

export async function loadHomeChallengeRows(input: {
  accountIds: string[];
  activeChallengeId: string | null;
  startDatePst: string;
  endDatePst: string;
}) {
  const readingChallengeMember = getReadingChallengeMemberDelegate();
  const { accountIds, activeChallengeId, startDatePst, endDatePst } = input;

  return Promise.all([
    prisma.$queryRaw<DailyDeltaSnapshot[]>(Prisma.sql`
      SELECT
        "accountId",
        "score",
        "reviewCount",
        "wkLevel",
        "radicalCount",
        "vocabularyCount",
        "burnedCount",
        "levelKanjiLearned"
      FROM (
        SELECT
          "accountId",
          "score",
          "reviewCount",
          "wkLevel",
          "radicalCount",
          "vocabularyCount",
          "burnedCount",
          "levelKanjiLearned",
          "snapshotDatePst",
          ROW_NUMBER() OVER (
            PARTITION BY "accountId"
            ORDER BY "snapshotDatePst" DESC
          ) AS "snapshotRank"
        FROM "DailyAccountSnapshot"
        WHERE "accountId" IN (${Prisma.join(accountIds)})
      ) AS "rankedSnapshots"
      WHERE "snapshotRank" <= 2
      ORDER BY "accountId", "snapshotDatePst" DESC
    `),
    prisma.readingSignoff.findMany({
      where: {
        signoffDatePst: {
          gte: startDatePst,
          lte: endDatePst,
        },
      },
      select: {
        id: true,
        accountId: true,
        signoffDatePst: true,
        bookTitle: true,
        pagesRead: true,
        minutesRead: true,
        didWanikaniReviews: true,
        reviewsLeft: true,
        apprenticeCount: true,
        currentWkLevel: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    readingChallengeMember
      ? readingChallengeMember.findMany({
          where: activeChallengeId
            ? {
                OR: [{ challengeId: activeChallengeId }, { challengeId: null }],
              }
            : undefined,
          select: {
            accountId: true,
            tracked: true,
          },
        })
      : prisma.readingChallengeMember.findMany({
          select: {
            accountId: true,
            tracked: true,
          },
        }),
  ]);
}

export function attachDailyDeltas(
  leaderboard: LeaderboardRow[],
  snapshots: DailyDeltaSnapshot[],
): LeaderboardRow[] {
  const latestTwoByAccount = new Map<string, DailyDeltaSnapshot[]>();

  for (const snapshot of snapshots) {
    const current = latestTwoByAccount.get(snapshot.accountId) ?? [];
    if (current.length >= 2) {
      continue;
    }

    current.push(snapshot);
    latestTwoByAccount.set(snapshot.accountId, current);
  }

  return leaderboard.map((row) => {
    const previous = latestTwoByAccount.get(row.id)?.[1] ?? null;
    if (!previous) {
      return { ...row, dailyDelta: null };
    }

    return {
      ...row,
      dailyDelta: {
        score: row.score - previous.score,
        reviewCount: row.reviewCount - previous.reviewCount,
        wkLevel: row.wkLevel - previous.wkLevel,
        radicalCount: row.radicalCount - previous.radicalCount,
        vocabularyCount: row.vocabularyCount - previous.vocabularyCount,
        burnedCount: row.burnedCount - previous.burnedCount,
        levelKanjiLearned: row.levelKanjiLearned - previous.levelKanjiLearned,
      },
    };
  });
}
