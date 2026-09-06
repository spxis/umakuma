import "server-only";

import { getVancouverDateKey } from "@/lib/dailySnapshot";
import { prisma } from "@/lib/prisma";
import { summariseXpTotals, type XpActivity } from "@/lib/xp/xpActivity";
import { protectedDayKeys } from "@/lib/xp/xpRestServer";

import { buildXpLedger, labelXpKinds, type XpKindShare, type XpLedgerDay } from "./xpLedger";

/**
 * Everything the XP history page shows, in one read.
 *
 * The events are joined to `XpType` rather than to a map of constants, because
 * the label and the sentence beside an amount are what an admin priced from the
 * site, and a retired kind keeps its row so old days still explain themselves.
 *
 * The summary above the ledger is `summariseXpActivity`, not a second pass over
 * the same rows: streak, days active, the split by kind, the best day and how
 * long since the last one are all already answered there, and two places
 * counting the same days is how they come to disagree.
 *
 * The rest and vacation days go in with them, because a streak the member is
 * shown must be the streak the awards are paid on. `memberStreak` in
 * `xpStreakServer.ts` hands `resolveStreak` the same protected days; a page
 * that left them out would tell somebody their hundred-day streak had broken
 * over a day the site itself held for them.
 */

/**
 * How many days of ledger the summary page draws.
 *
 * A window, not a limit on the truth: the totals above it are still the whole
 * account, and the whole record is browsable at `/xp/history`. Sixty days is
 * about as far back as anybody scrolls on a page whose job is "how am I
 * doing", and it is what stops this read growing forever.
 */
export const XP_LEDGER_WINDOW_DAYS = 60;

export type XpHistory = {
  /** Newest day first, and only the most recent `XP_LEDGER_WINDOW_DAYS` of them. */
  days: XpLedgerDay[];
  activity: XpActivity;
  /** The activity's split by kind, with the labels a member reads. */
  byKind: XpKindShare[];
  /** Days the account has ever been active, so the page can say what it is not showing. */
  totalDays: number;
};

export async function loadXpHistory(accountId: string, now = new Date()): Promise<XpHistory> {
  /*
   * Three reads instead of one, and all three are bounded by something that
   * grows slowly. This used to be a single `findMany` with no `take` at all:
   * `XpEvent` is one row per kind per day, so a member three years in had
   * thousands of rows read on every render of a page that mostly wanted a
   * streak and a bar chart.
   *
   * Per-day and per-kind totals are what the summary is a fold over, so the
   * database does the folding; the ledger then reads only the window it draws.
   */
  const [perDay, perKind, protectedDays] = await Promise.all([
    prisma.xpEvent.groupBy({
      by: ["dayKey"],
      where: { accountId },
      _sum: { amount: true },
      orderBy: { dayKey: "desc" },
    }),
    prisma.xpEvent.groupBy({ by: ["kind"], where: { accountId }, _sum: { amount: true } }),
    protectedDayKeys(accountId),
  ]);

  const dayTotals = perDay.map((row) => ({ dayKey: row.dayKey, amount: row._sum.amount ?? 0 }));
  const window = dayTotals.slice(0, XP_LEDGER_WINDOW_DAYS);
  const oldestShown = window.at(-1)?.dayKey ?? null;

  const rows = oldestShown
    ? await prisma.xpEvent.findMany({
        where: { accountId, dayKey: { gte: oldestShown } },
        orderBy: [{ dayKey: "desc" }],
        select: {
          kind: true,
          dayKey: true,
          amount: true,
          note: true,
          type: { select: { label: true, note: true } },
        },
      })
    : [];

  /* A kind with no type row left falls back to its id: legible, and it does
     not hide a day's earning behind a blank. */
  const labels = new Map(rows.map((row) => [row.kind, row.type?.label ?? row.kind]));

  const activity: XpActivity = summariseXpTotals(
    {
      perDay: dayTotals,
      perKind: perKind.map((row) => ({ kind: row.kind, amount: row._sum.amount ?? 0 })),
    },
    getVancouverDateKey(now),
    protectedDays,
  );

  /* What the window does not show, so its running total still counts from
     the member's first day rather than from the edge of the page. */
  const shown = window.reduce((sum, day) => sum + day.amount, 0);

  return {
    days: buildXpLedger(
      rows.map((row) => ({
        kind: row.kind,
        dayKey: row.dayKey,
        amount: row.amount,
        note: row.note,
        label: labels.get(row.kind) ?? row.kind,
        typeNote: row.type?.note ?? "",
      })),
      activity.totalXp - shown,
    ),
    activity,
    byKind: labelXpKinds(activity.byKind, labels),
    totalDays: dayTotals.length,
  };
}
