import "server-only";

import { prisma } from "@/lib/prisma";
import { getVancouverDateKey } from "@/lib/dailySnapshot";

import { XP_ONCE_PER_DAY, xpAwardValue, type XpAwardKind } from "./xpAwards";
import { gamesPerDayAt } from "./xpEntitlements";
import type { XpAwardRequest } from "./xpStudyAwards";
import { xpLevelFor } from "./xpCurve";

/**
 * Awarding XP, once, with the day's caps applied.
 *
 * Every award goes through here so the caps cannot be bypassed by a caller
 * that forgot them, and so `Account.xp` and `Account.xpLevel` are written in
 * one place — the same reasoning as `syncAccountUkLevel`, and for the same
 * reason: a materialised number with several writers eventually disagrees with
 * what it was derived from.
 */

export type XpAwardResult = {
  awarded: number;
  xp: number;
  level: number;
  /** True when this award is what moved the rank, so a page can say so. */
  rankedUp: boolean;
};

export async function awardXp({
  accountId,
  kind,
  note,
  now = new Date(),
}: {
  accountId: string;
  kind: XpAwardKind;
  /**
   * What *this* award was for, where the kind's own note is too general.
   *
   * The type row says what a streak milestone is; this says which one — "a
   * 30-day streak", "level 20, N4 complete", "ten out of ten". Without it a
   * member's history reads as a column of identical lines, and the caller is
   * the only thing that knows the difference.
   */
  note?: string | null;
  now?: Date;
}): Promise<XpAwardResult> {
  const dayKey = getVancouverDateKey(now);
  const existing = await prisma.xpEvent.findUnique({
    where: { accountId_kind_dayKey: { accountId, kind, dayKey } },
    select: { amount: true },
  });

  /* A once-a-day award whose row already exists has been earned. */
  if (existing && XP_ONCE_PER_DAY.includes(kind)) {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { xp: true, xpLevel: true },
    });
    return { awarded: 0, xp: account?.xp ?? 0, level: account?.xpLevel ?? 1, rankedUp: false };
  }

  /* The games cap is the one entitlement a rank buys, so it is read from the
     member's standing rather than from the static table. Doing it here rather
     than in `xpAwardValue` keeps that function pure and keeps the rank out of
     a module that should not need a database. */
  const standing = await prisma.account.findUnique({
    where: { id: accountId },
    select: { xpLevel: true },
  });
  const amount = xpAwardValue(kind, existing?.amount ?? 0, {
    gamesPerDay: gamesPerDayAt(standing?.xpLevel ?? 1),
  });
  if (amount <= 0) {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { xp: true, xpLevel: true },
    });
    return { awarded: 0, xp: account?.xp ?? 0, level: account?.xpLevel ?? 1, rankedUp: false };
  }

  const [, account] = await prisma.$transaction([
    prisma.xpEvent.upsert({
      where: { accountId_kind_dayKey: { accountId, kind, dayKey } },
      create: { accountId, kind, dayKey, amount, note: note ?? null },
      update: {
        amount: { increment: amount },
        /* Only when one is given. The row accumulates, so a routine award
           landing later in the day must not blank the note a bonus wrote
           earlier - and a note is worth more than the absence of one. */
        ...(note ? { note } : {}),
      },
    }),
    prisma.account.update({
      where: { id: accountId },
      data: { xp: { increment: amount } },
      select: { xp: true, xpLevel: true },
    }),
  ]);

  const level = xpLevelFor(account.xp);
  if (level !== account.xpLevel) {
    await prisma.account.update({ where: { id: accountId }, data: { xpLevel: level } });
  }

  return { awarded: amount, xp: account.xp, level, rankedUp: level > account.xpLevel };
}

/** What a member has earned today, by kind, for showing a cap as it fills. */
export async function xpEarnedToday(accountId: string, now = new Date()): Promise<Record<string, number>> {
  const rows = await prisma.xpEvent.findMany({
    where: { accountId, dayKey: getVancouverDateKey(now) },
    select: { kind: true, amount: true },
  });
  return Object.fromEntries(rows.map((row) => [row.kind, row.amount]));
}

/**
 * Awarding XP without ever being able to fail the thing that earned it.
 *
 * A review that scores correctly and cannot record its XP is still a completed
 * review. The member answered, the stage moved, and the one thing that must not
 * happen is the answer coming back as an error because a bookkeeping write fell
 * over. So every failure here is logged and swallowed, and the caller is told
 * what was actually awarded rather than being handed something to check.
 *
 * `times` is a loop rather than an amount, because the day's caps live in
 * `awardXp` and nowhere else - multiplying here would be a second place that
 * knows how a cap works, and two places eventually disagree. It stops early
 * once an award comes back worth nothing: a cap only tightens across a day, so
 * the remaining round trips would each return zero.
 */
export async function awardXpQuietly({
  accountId,
  requests,
  now = new Date(),
}: {
  accountId: string;
  requests: XpAwardRequest[];
  now?: Date;
}): Promise<number> {
  let total = 0;
  for (const request of requests) {
    const times = Math.max(0, Math.trunc(request.times ?? 1));
    for (let attempt = 0; attempt < times; attempt += 1) {
      try {
        const { awarded } = await awardXp({ accountId, kind: request.kind, note: request.note, now });
        if (awarded <= 0) break;
        total += awarded;
      } catch (problem) {
        console.error("Could not award XP", request.kind, problem);
        break;
      }
    }
  }
  return total;
}
