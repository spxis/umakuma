import { prisma } from "@/lib/prisma";
import { isReviewResult, type ReviewResult } from "@/lib/domainConstants";

type AdminStudyHistoryQuery = {
  accountId?: string;
  result?: ReviewResult;
  page: number;
  pageSize: number;
};

export type AdminStudyHistoryRow = {
  id: string;
  accountId: string;
  nickname: string;
  wkUsername: string;
  assignmentId: number;
  subjectId: number;
  /**
   * The character itself, which is what the row is actually about.
   *
   * An attempt stores a subject id, and the table showed that id - so a page
   * of study history read as a column of five-figure numbers with no way to
   * tell 水 from 火. Null when the catalogue has no such subject, which is a
   * real state rather than an error: a subject can be answered and later
   * withdrawn by WaniKani, and the id is still the honest thing to show.
   */
  characters: string | null;
  subjectType: string;
  result: string;
  submittedAt: string;
};

export type AdminStudyHistoryPage = {
  attempts: AdminStudyHistoryRow[];
  totals: Record<string, number>;
  accountCount: number;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
};

function normalizePage(raw: string | null): number {
  const parsed = Number(raw ?? "1");
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }
  return Math.trunc(parsed);
}

function normalizePageSize(raw: string | null): number {
  const parsed = Number(raw ?? "30");
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 30;
  }
  return Math.min(100, Math.trunc(parsed));
}

function normalizeResult(raw: string | null): AdminStudyHistoryQuery["result"] {
  if (isReviewResult(raw)) {
    return raw;
  }

  return undefined;
}

export function parseAdminStudyHistoryQuery(url: URL): AdminStudyHistoryQuery {
  return {
    accountId: url.searchParams.get("accountId") ?? undefined,
    result: normalizeResult(url.searchParams.get("result")),
    page: normalizePage(url.searchParams.get("page")),
    pageSize: normalizePageSize(url.searchParams.get("pageSize")),
  };
}

export async function getAdminStudyHistoryPage(args: AdminStudyHistoryQuery): Promise<AdminStudyHistoryPage> {
  const where = {
    ...(args.accountId ? { accountId: args.accountId } : {}),
    ...(args.result ? { result: args.result } : {}),
  };

  const total = await prisma.studyReviewAttempt.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / args.pageSize));
  const page = Math.min(args.page, totalPages);
  const skip = (page - 1) * args.pageSize;

  const [attemptRows, totalsByResultRows, accountRowsWithHistory] = await Promise.all([
    prisma.studyReviewAttempt.findMany({
      where,
      orderBy: { submittedAt: "desc" },
      skip,
      take: args.pageSize,
      select: {
        id: true,
        accountId: true,
        assignmentId: true,
        subjectId: true,
        subjectType: true,
        result: true,
        submittedAt: true,
      },
    }),
    prisma.studyReviewAttempt.groupBy({
      by: ["result"],
      where,
      _count: {
        _all: true,
      },
    }),
    prisma.studyReviewAttempt.groupBy({
      by: ["accountId"],
      where,
      _count: {
        _all: true,
      },
    }),
  ]);

  const accountIds = Array.from(new Set(attemptRows.map((row) => row.accountId)));
  const accountRows = accountIds.length > 0
    ? await prisma.account.findMany({
        where: { id: { in: accountIds } },
        select: {
          id: true,
          nickname: true,
          wkUsername: true,
        },
      })
    : [];

  const accountMap = new Map(accountRows.map((row) => [row.id, row]));

  /*
   * The characters for this page's subjects, in one query.
   *
   * Same shape as the account lookup above: collect the ids the page actually
   * shows, ask once, map them in. A page is twenty to fifty rows, so this is a
   * single indexed read on the primary key rather than anything that grows
   * with the twenty thousand attempts behind it.
   */
  const subjectIds = Array.from(new Set(attemptRows.map((row) => row.subjectId)));
  const subjectRows = subjectIds.length > 0
    ? await prisma.wkSubjectCatalog.findMany({
        where: { wkSubjectId: { in: subjectIds } },
        select: { wkSubjectId: true, characters: true },
      })
    : [];

  const charactersById = new Map(subjectRows.map((row) => [row.wkSubjectId, row.characters]));

  const attempts = attemptRows.map((row) => {
    const account = accountMap.get(row.accountId);
    const fallbackUser = row.accountId;
    return {
      id: row.id,
      accountId: row.accountId,
      nickname: account?.nickname ?? fallbackUser,
      wkUsername: account?.wkUsername ?? fallbackUser,
      assignmentId: row.assignmentId,
      subjectId: row.subjectId,
      characters: charactersById.get(row.subjectId) ?? null,
      subjectType: row.subjectType,
      result: row.result,
      submittedAt: row.submittedAt.toISOString(),
    };
  });

  const totals: Record<string, number> = {};
  for (const row of totalsByResultRows) {
    totals[row.result] = row._count._all;
  }

  return {
    attempts,
    totals,
    accountCount: accountRowsWithHistory.length,
    pagination: {
      page,
      pageSize: args.pageSize,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
  };
}
