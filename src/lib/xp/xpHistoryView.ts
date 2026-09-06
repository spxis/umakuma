import "server-only";

import { prisma } from "@/lib/prisma";

import {
  XP_HISTORY_SORTS,
  type XpHistoryPage,
  type XpHistoryQuery,
  type XpHistorySort,
  type XpHistorySortDir,
} from "./xpHistoryQuery";

/**
 * One page of a member's XP history, read from the database.
 *
 * The vocabulary - sorts, page sizes, the row shape, the query parser - lives
 * in `xpHistoryQuery.ts` because the browsing table needs it in the browser.
 * This half is server-only and is the only part that touches Prisma.
 *
 * `skip`/`take` in the database rather than a slice in memory: the ledger on
 * the XP page loads every event on the account, which is fine for a summary
 * that stops and wrong for a record that grows every day forever.
 */

/**
 * The database's own ordering for a sort key.
 *
 * Every sort falls back to the day, because two rows of the same amount or the
 * same kind are otherwise returned in whatever order the planner liked - which
 * makes page 2 disagree with page 1 about what it already showed.
 */
function orderFor(sortBy: XpHistorySort, sortDir: XpHistorySortDir) {
  const day = { dayKey: sortDir };
  if (sortBy === XP_HISTORY_SORTS.amount) return [{ amount: sortDir }, day];
  if (sortBy === XP_HISTORY_SORTS.kind) return [{ kind: sortDir }, { dayKey: "desc" as const }];
  return [day, { kind: "asc" as const }];
}

export async function getXpHistoryPage(query: XpHistoryQuery): Promise<XpHistoryPage> {
  const accountId = query.accountId ?? "";
  const scoped = { accountId };
  const filtered = { accountId, ...(query.kind ? { kind: query.kind } : {}) };

  const [total, rows, kindRows, types, whole] = await Promise.all([
    prisma.xpEvent.count({ where: filtered }),
    prisma.xpEvent.findMany({
      where: filtered,
      orderBy: orderFor(query.sortBy, query.sortDir),
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        kind: true,
        dayKey: true,
        amount: true,
        note: true,
        createdAt: true,
        updatedAt: true,
        type: { select: { label: true, note: true } },
      },
    }),
    prisma.xpEvent.groupBy({ by: ["kind"], where: scoped, _count: true, _sum: { amount: true } }),
    prisma.xpType.findMany({ select: { id: true, label: true } }),
    prisma.xpEvent.aggregate({ where: scoped, _count: true, _sum: { amount: true } }),
  ]);

  const filteredSum = query.kind
    ? (kindRows.find((row) => row.kind === query.kind)?._sum.amount ?? 0)
    : (whole._sum.amount ?? 0);

  const labels = new Map(types.map((type) => [type.id, type.label]));

  return {
    rows: rows.map((row) => ({
      id: `${row.dayKey}:${row.kind}`,
      dayKey: row.dayKey,
      kind: row.kind,
      label: row.type?.label ?? row.kind,
      amount: row.amount,
      note: row.note ?? row.type?.note ?? null,
      firstAt: row.createdAt.toISOString(),
      lastAt: row.updatedAt.toISOString(),
    })),
    facets: kindRows
      .map((row) => ({
        kind: row.kind,
        label: labels.get(row.kind) ?? row.kind,
        count: row._count,
        total: row._sum.amount ?? 0,
      }))
      .sort((left, right) => right.total - left.total || left.label.localeCompare(right.label)),
    allCount: whole._count,
    allTotal: whole._sum.amount ?? 0,
    filteredTotal: filteredSum,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
  };
}
