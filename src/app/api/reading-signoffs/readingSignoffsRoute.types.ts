export type ReadingSignoffEntryDelegate = {
  findMany: (args: {
    where: Record<string, unknown>;
    orderBy?: Array<Record<string, "asc" | "desc">>;
  }) => Promise<Array<{
    id: string;
    challengeId?: string | null;
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
  }>>;
  create: (args: {
    data: Record<string, unknown>;
  }) => Promise<unknown>;
};
