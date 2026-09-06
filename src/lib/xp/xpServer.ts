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
 * one place — the same reasoning as `syncAccountUnLevel`, and for the same
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

  return creditXp({ accountId, kind, dayKey, amount, note });
}

/**
 * The write itself: the day's row, the member's total, and the rank that falls
 * out of it.
 *
 * Held apart from `awardXp` so that deciding *how much* and writing *that much*
 * are two jobs rather than one. Everything a member earns is capped on the way
 * in; an admin's award is not, and both still land here, so `Account.xp` and
 * `Account.xpLevel` keep the single writer this module exists to give them.
 */
async function creditXp({
  accountId,
  kind,
  dayKey,
  amount,
  note,
}: {
  accountId: string;
  kind: string;
  dayKey: string;
  amount: number;
  note?: string | null;
}): Promise<XpAwardResult> {
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

/**
 * An admin handing a member XP directly.
 *
 * **The daily cap does not apply, and neither does the once-a-day rule.** A cap
 * shapes what a member can earn by grinding, and this was not earned by
 * grinding: it is a decision somebody made about this member, on this day, with
 * their name on it. Trimming 500 down to the 15 left under the cap and
 * returning success would be the worst available answer - the admin would be
 * told it worked, the member would get a fraction, and nothing on either screen
 * would say why. If an award should be refused it should be refused out loud,
 * and there is nobody to refuse it to: the admin *is* the authority the cap
 * defers to.
 *
 * What it does not do is get its own ledger. The award accumulates onto the
 * day's row for its kind, like every other award, because `XpEvent` is one row
 * per kind per day by design - the cap read and the once-a-day check are both
 * that row existing. The consequence is real and worth stating: an admin award
 * of a *capped* kind fills that kind's cap for the day, so the member's own
 * earning of that kind is squeezed for the rest of it. That is why the panel
 * shows each type's cap and what the member has already earned today beside the
 * amount field - the trade is put in front of the admin rather than discovered
 * by the member. Giving admin grants a ledger of their own means a second table
 * or a wider unique index, and neither is worth buying before somebody has been
 * bitten by this.
 *
 * `amount` is the admin's, already validated at the route boundary; `kind` is
 * an `XpType.id` read from the database rather than an `XpAwardKind`, so a
 * retired type can still be awarded deliberately.
 */
export async function awardXpAsAdmin({
  accountId,
  kind,
  amount,
  note,
  now = new Date(),
}: {
  accountId: string;
  kind: string;
  amount: number;
  note?: string | null;
  now?: Date;
}): Promise<XpAwardResult> {
  return creditXp({
    accountId,
    kind,
    dayKey: getVancouverDateKey(now),
    amount,
    note: note ?? null,
  });
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
  const results = await awardXpEachQuietly({ accountId, requests, now });
  return results.reduce((total, result) => total + result.awarded, 0);
}

/** What one request in a batch came to, and whether anything came of it. */
export type XpAwardOutcome = { kind: XpAwardKind; awarded: number };

/**
 * The same awarding, itemised.
 *
 * A caller that only needs the total takes `awardXpQuietly`, which is this
 * with the addition done for it. A caller that has to *say* what happened
 * needs the parts: a member whose third game of the day was their best ever
 * earned nothing for finishing it and fifty for beating themselves, and one
 * toast reading "+50 XP" cannot tell them either half of that. It is also the
 * only honest way to record why a run paid nothing, since a zero total is the
 * same number whether the cap bit or the award was never earned.
 */
export async function awardXpEachQuietly({
  accountId,
  requests,
  now = new Date(),
}: {
  accountId: string;
  requests: XpAwardRequest[];
  now?: Date;
}): Promise<XpAwardOutcome[]> {
  const outcomes: XpAwardOutcome[] = [];
  for (const request of requests) {
    const times = Math.max(0, Math.trunc(request.times ?? 1));
    let awarded = 0;
    for (let attempt = 0; attempt < times; attempt += 1) {
      try {
        const result = await awardXp({ accountId, kind: request.kind, note: request.note, now });
        if (result.awarded <= 0) break;
        awarded += result.awarded;
      } catch (problem) {
        console.error("Could not award XP", request.kind, problem);
        break;
      }
    }
    outcomes.push({ kind: request.kind, awarded });
  }
  return outcomes;
}
