import "server-only";

import { getVancouverDateKey } from "@/lib/dailySnapshot";
import { prisma } from "@/lib/prisma";
import { summariseXpActivity, type XpActivity } from "@/lib/xp/xpActivity";
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

export type XpHistory = {
  /** Newest day first. */
  days: XpLedgerDay[];
  activity: XpActivity;
  /** The activity's split by kind, with the labels a member reads. */
  byKind: XpKindShare[];
};

export async function loadXpHistory(accountId: string, now = new Date()): Promise<XpHistory> {
  const [rows, protectedDays] = await Promise.all([
    prisma.xpEvent.findMany({
      where: { accountId },
      orderBy: [{ dayKey: "desc" }],
      select: {
        kind: true,
        dayKey: true,
        amount: true,
        note: true,
        type: { select: { label: true, note: true } },
      },
    }),
    protectedDayKeys(accountId),
  ]);

  /* A kind with no type row left falls back to its id: legible, and it does
     not hide a day's earning behind a blank. */
  const labels = new Map(rows.map((row) => [row.kind, row.type?.label ?? row.kind]));

  const activity: XpActivity = summariseXpActivity(
    rows.map((row) => ({ dayKey: row.dayKey, kind: row.kind, amount: row.amount })),
    getVancouverDateKey(now),
    protectedDays,
  );

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
    ),
    activity,
    byKind: labelXpKinds(activity.byKind, labels),
  };
}
