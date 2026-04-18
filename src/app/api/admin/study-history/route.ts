import { NextResponse } from "next/server";

import { isAuthorizedAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  if (!(await isAuthorizedAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get("limit") ?? "50");
  const limit = Math.min(Math.max(1, limitRaw), 200);
  const accountId = url.searchParams.get("accountId") ?? undefined;

  const where = accountId ? { accountId } : {};

  const [attempts, totals, accountStats, accountRows] = await Promise.all([
    prisma.studyReviewAttempt.findMany({
      where,
      orderBy: { submittedAt: "desc" },
      take: limit,
    }),
    prisma.studyReviewAttempt.groupBy({
      by: ["result"],
      where,
      _count: true,
    }),
    prisma.studyReviewAttempt.groupBy({
      by: ["accountId"],
      where,
      _count: true,
    }),
    prisma.account.findMany({
      select: { id: true, nickname: true },
    }),
  ]);

  const nicknameMap = new Map(accountRows.map((a) => [a.id, a.nickname]));

  const totalsByResult: Record<string, number> = {};
  for (const row of totals) {
    totalsByResult[row.result] = row._count;
  }

  return NextResponse.json({
    attempts: attempts.map((a) => ({
      id: a.id,
      accountId: a.accountId,
      nickname: nicknameMap.get(a.accountId) ?? a.accountId,
      assignmentId: a.assignmentId,
      subjectId: a.subjectId,
      subjectType: a.subjectType,
      result: a.result,
      submittedAt: a.submittedAt.toISOString(),
    })),
    totals: totalsByResult,
    accountCount: accountStats.length,
  });
}
