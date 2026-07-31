import { prisma } from "@/lib/prisma";

export type ReadingSignoffEntryDelegate = typeof prisma.readingSignoffEntry;
export type ReadingSignoffDelegate = typeof prisma.readingSignoff;

export function getReadingSignoffEntryDelegate(): ReadingSignoffEntryDelegate | null {
  return prisma.readingSignoffEntry;
}

export function getReadingSignoffDelegate(): ReadingSignoffDelegate | null {
  return prisma.readingSignoff;
}

export type AdminReadingSignoffEntryRecord = {
  id: string;
  accountId: string;
  nickname: string;
  wkUsername: string;
  source: "daily" | "entry";
  signoffDatePst: string;
  bookTitle: string;
  pagesRead: number;
  minutesRead: number;
  didWanikaniReviews: boolean;
  reviewsLeft: number;
  reviewWorkDone: number;
  reviewCorrect: number;
  reviewIncorrect: number;
  reviewSuccessPercent: number | null;
  createdAt: string;
  updatedAt: string | null;
};

type ReadingSignoffEntryRow = {
  id: string;
  accountId: string;
  signoffDatePst: string;
  bookTitle: string;
  pagesRead: number;
  minutesRead: number;
  didWanikaniReviews: boolean;
  reviewWorkDone: number;
  reviewCorrect: number;
  reviewIncorrect: number;
  reviewSuccessPercent: number | null;
  createdAt: Date;
};

type ReadingSignoffRow = {
  id: string;
  accountId: string;
  signoffDatePst: string;
  bookTitle: string;
  pagesRead: number;
  minutesRead: number;
  didWanikaniReviews: boolean;
  reviewsLeft: number;
  createdAt: Date;
  updatedAt: Date;
};

export function toAdminReadingSignoffEntryRecord(
  row: ReadingSignoffEntryRow,
  memberByAccountId: Map<string, { nickname: string; wkUsername: string }>,
): AdminReadingSignoffEntryRecord {
  const member = memberByAccountId.get(row.accountId);
  return {
    id: row.id,
    accountId: row.accountId,
    nickname: member?.nickname ?? "Unknown",
    wkUsername: member?.wkUsername ?? "-",
    source: "entry",
    signoffDatePst: row.signoffDatePst,
    bookTitle: row.bookTitle,
    pagesRead: row.pagesRead,
    minutesRead: row.minutesRead,
    didWanikaniReviews: row.didWanikaniReviews,
    reviewsLeft: row.reviewWorkDone,
    reviewWorkDone: row.reviewWorkDone,
    reviewCorrect: row.reviewCorrect,
    reviewIncorrect: row.reviewIncorrect,
    reviewSuccessPercent: row.reviewSuccessPercent,
    createdAt: row.createdAt.toISOString(),
    updatedAt: null,
  };
}

export function toAdminReadingSignoffRecord(
  row: ReadingSignoffRow,
  memberByAccountId: Map<string, { nickname: string; wkUsername: string }>,
): AdminReadingSignoffEntryRecord {
  const member = memberByAccountId.get(row.accountId);
  return {
    id: row.id,
    accountId: row.accountId,
    nickname: member?.nickname ?? "Unknown",
    wkUsername: member?.wkUsername ?? "-",
    source: "daily",
    signoffDatePst: row.signoffDatePst,
    bookTitle: row.bookTitle,
    pagesRead: row.pagesRead,
    minutesRead: row.minutesRead,
    didWanikaniReviews: row.didWanikaniReviews,
    reviewsLeft: row.reviewsLeft,
    reviewWorkDone: 0,
    reviewCorrect: 0,
    reviewIncorrect: 0,
    reviewSuccessPercent: null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function recalculateReadingSignoffForDay(
  accountId: string,
  signoffDatePst: string,
  readingSignoffEntry: ReadingSignoffEntryDelegate,
  readingSignoff: ReadingSignoffDelegate,
): Promise<void> {
  const dayEntries = await readingSignoffEntry.findMany({
    where: {
      accountId,
      signoffDatePst,
    },
    orderBy: [{ createdAt: "asc" }],
  });

  if (dayEntries.length === 0) {
    await readingSignoff.deleteMany({
      where: {
        accountId,
        signoffDatePst,
      },
    });
    return;
  }

  const totalPagesRead = dayEntries.reduce((sum, row) => sum + row.pagesRead, 0);
  const totalMinutesRead = dayEntries.reduce((sum, row) => sum + row.minutesRead, 0);
  const didAnyWanikaniReviews = dayEntries.some((row) => row.didWanikaniReviews);

  const latest = dayEntries[dayEntries.length - 1];
  const latestBookTitle = [...dayEntries]
    .reverse()
    .map((row) => row.bookTitle.trim())
    .find((title) => title.length > 0) ?? "Reviews only";

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: {
      apprenticeCount: true,
      wkLevel: true,
    },
  });

  await readingSignoff.upsert({
    where: {
      accountId_signoffDatePst: {
        accountId,
        signoffDatePst,
      },
    },
    update: {
      bookTitle: latestBookTitle,
      pagesRead: totalPagesRead,
      minutesRead: totalMinutesRead,
      didWanikaniReviews: didAnyWanikaniReviews,
      reviewsLeft: latest.reviewWorkDone,
      apprenticeCount: account?.apprenticeCount ?? 0,
      currentWkLevel: account?.wkLevel ?? 0,
    },
    create: {
      accountId,
      signoffDatePst,
      bookTitle: latestBookTitle,
      pagesRead: totalPagesRead,
      minutesRead: totalMinutesRead,
      didWanikaniReviews: didAnyWanikaniReviews,
      reviewsLeft: latest.reviewWorkDone,
      apprenticeCount: account?.apprenticeCount ?? 0,
      currentWkLevel: account?.wkLevel ?? 0,
    },
  });
}
