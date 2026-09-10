import "server-only";

import { prisma } from "@/lib/prisma";
import { getCatalogSubjectDetails } from "@/lib/subjectCatalogDetails";

import {
  XP_HISTORY_SORTS,
  type XpHistoryPage,
  type XpHistoryQuery,
  type XpHistorySort,
  type XpHistorySortDir,
  type XpHistoryItem,
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


/**
 * What each row on this page was actually for.
 *
 * `XpEvent` is the day's tally and cannot hold an item, so the characters come
 * from `XpAward` beside it - one row per award, written since 1.110.0. Only
 * the page's own rows are looked up, not the account's history: the table
 * pages for a reason and this must not undo it.
 *
 * **Nothing is truncated.** A day of two hundred reviews returns two hundred
 * items. John: "the xp table should show us each kanji that we studied because
 * of this history... even if we did 200 kanji." They arrive in the order they
 * were earned, and the ones a daily cap paid nothing for come with the rest,
 * marked, because a capped day that shows only the paid part is the silence
 * this table exists to end.
 */
async function itemsForRows(
  accountId: string,
  rows: readonly { dayKey: string; kind: string }[],
): Promise<Map<string, XpHistoryItem[]>> {
  const byRow = new Map<string, XpHistoryItem[]>();
  if (rows.length === 0) return byRow;

  const awards = await prisma.xpAward.findMany({
    where: {
      accountId,
      subjectId: { not: null },
      OR: rows.map((row) => ({ dayKey: row.dayKey, kind: row.kind })),
    },
    orderBy: { awardedAt: "asc" },
    select: { dayKey: true, kind: true, amount: true, subjectId: true },
  });
  if (awards.length === 0) return byRow;

  /* One catalogue read for the whole page rather than one per row: the same
     character turns up under Review Answered and Review Correct on the same
     day, and often under a dozen days above it. */
  const details = await getCatalogSubjectDetails(
    awards.flatMap((award) => (award.subjectId === null ? [] : [award.subjectId])),
  );

  for (const award of awards) {
    if (award.subjectId === null) continue;
    const detail = details.get(award.subjectId);
    const key = `${award.dayKey}:${award.kind}`;
    const held = byRow.get(key) ?? [];
    held.push({
      subjectId: award.subjectId,
      /* The id itself when the catalogue has never heard of it - a practice
         subject, or an item retired since. Better a number a reader can look
         up than a row that quietly drops one of the two hundred. */
      glyph: detail?.characters || String(award.subjectId),
      meaning: detail?.meanings[0] ?? null,
      subjectType: detail?.subjectType ?? "",
      paid: award.amount > 0,
    });
    byRow.set(key, held);
  }
  return byRow;
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
  const itemsByRow = await itemsForRows(accountId, rows);

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
      items: itemsByRow.get(`${row.dayKey}:${row.kind}`) ?? [],
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
