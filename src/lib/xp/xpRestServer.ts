import "server-only";

import { getVancouverDateKey } from "@/lib/dailySnapshot";
import { prisma } from "@/lib/prisma";

import { restDaysAllowedAt, restStanding, vacationWeeksAllowedAt, type RestStanding } from "./xpRest";
import { timeOffRules } from "./xpRestSettings";

/**
 * Starting, ending and accounting for time off.
 *
 * The streak is the visible half and the smaller one. What actually stops
 * somebody coming back after a fortnight away is the review queue: four
 * hundred items waiting is not a challenge, it is a reason to close the tab.
 * So ending a vacation moves every due date forward by the length of the
 * absence — the member returns to the queue they left, on the schedule they
 * left it on.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ROLLING_YEAR_DAYS = 365;

function dayKeysBetween(from: Date, to: Date): string[] {
  const days: string[] = [];
  for (let at = from.getTime(); at <= to.getTime(); at += MS_PER_DAY) {
    days.push(getVancouverDateKey(new Date(at)));
  }
  return days;
}

/** Days off used in the rolling year, which is the window the allowance is for. */
export async function memberRestStanding(accountId: string, now = new Date()): Promise<RestStanding> {
  const since = new Date(now.getTime() - ROLLING_YEAR_DAYS * MS_PER_DAY);
  const [account, used] = await Promise.all([
    prisma.account.findUnique({
      where: { id: accountId },
      select: { xpLevel: true, vacationStartedAt: true, vacationEndsAt: true },
    }),
    prisma.memberRest.groupBy({
      by: ["kind"],
      where: { accountId, createdAt: { gte: since } },
      _count: { _all: true },
    }),
  ]);

  const rules = await timeOffRules();
  const count = (kind: string) => used.find((row) => row.kind === kind)?._count._all ?? 0;
  const xpLevel = account?.xpLevel ?? 1;
  return {
    ...restStanding({
      xpLevel,
      restDaysUsed: count("rest"),
      vacationDaysUsed: count("vacation"),
      onVacation: account?.vacationEndsAt !== null && (account?.vacationEndsAt ?? new Date(0)) > now,
    }),
    /* Recomputed against the live rules rather than the constants, which are
       only the defaults a fresh environment starts with. */
    restDaysAllowed: restDaysAllowedAt(xpLevel, rules.restDays),
    restDaysLeft: Math.max(0, restDaysAllowedAt(xpLevel, rules.restDays) - count("rest")),
    vacationWeeksAllowed: vacationWeeksAllowedAt(xpLevel, rules.vacationWeeks),
    vacationDaysLeft: Math.max(0, vacationWeeksAllowedAt(xpLevel, rules.vacationWeeks) * 7 - count("vacation")),
  };
}

/** Every day the streak is held for this member, for `resolveStreak`. */
export async function protectedDayKeys(accountId: string): Promise<string[]> {
  const rows = await prisma.memberRest.findMany({ where: { accountId }, select: { dayKey: true } });
  return rows.map((row) => row.dayKey);
}

export type VacationRefusal = "notUnlocked" | "tooLong" | "noAllowanceLeft" | "alreadyAway";

/**
 * Books a vacation, writing every day of it up front.
 *
 * Up front rather than on return, because nothing may run again until the
 * member comes back: a span written lazily is a span that does not exist while
 * it is most needed.
 */
export async function startVacation({
  accountId,
  days,
  now = new Date(),
}: {
  accountId: string;
  days: number;
  now?: Date;
}): Promise<{ ok: true; endsAt: Date } | { ok: false; refusal: VacationRefusal }> {
  const [standing, rules] = await Promise.all([memberRestStanding(accountId, now), timeOffRules()]);
  if (standing.onVacation) return { ok: false, refusal: "alreadyAway" };
  if (standing.vacationWeeksAllowed === 0) return { ok: false, refusal: "notUnlocked" };
  if (days > rules.maxVacationDaysAtOnce) return { ok: false, refusal: "tooLong" };
  if (days > standing.vacationDaysLeft) return { ok: false, refusal: "noAllowanceLeft" };

  const endsAt = new Date(now.getTime() + days * MS_PER_DAY);
  const periodId = `vac_${now.getTime()}`;
  await prisma.$transaction([
    prisma.memberRest.createMany({
      data: dayKeysBetween(now, endsAt).map((dayKey) => ({ accountId, dayKey, kind: "vacation" as const, periodId })),
      skipDuplicates: true,
    }),
    prisma.account.update({
      where: { id: accountId },
      data: { vacationStartedAt: now, vacationEndsAt: endsAt },
    }),
  ]);
  return { ok: true, endsAt };
}

/**
 * Ends a vacation and gives the member their queue back.
 *
 * Every due date in the future *and the past* shifts by however long they were
 * actually away — the past ones matter most, because those are the items that
 * came due while nobody was there and would otherwise all be waiting at once.
 */
export async function endVacation({
  accountId,
  now = new Date(),
}: {
  accountId: string;
  now?: Date;
}): Promise<{ ok: boolean; shiftedDays: number; itemsShifted: number }> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { vacationStartedAt: true },
  });
  if (!account?.vacationStartedAt) return { ok: false, shiftedDays: 0, itemsShifted: 0 };

  const awayMs = Math.max(0, now.getTime() - account.vacationStartedAt.getTime());
  const shiftedDays = Math.round(awayMs / MS_PER_DAY);

  /* Raw SQL because Prisma cannot express "add an interval to a column" in an
     updateMany, and reading nine thousand rows to write them back one at a
     time would be a great deal of work to do something the database can do in
     one statement. */
  const itemsShifted = await prisma.$executeRaw`
    UPDATE "UkSrsState"
       SET "availableAt" = "availableAt" + (${awayMs} || ' milliseconds')::interval
     WHERE "accountId" = ${accountId}
       AND "availableAt" IS NOT NULL
  `;

  await prisma.account.update({
    where: { id: accountId },
    data: { vacationStartedAt: null, vacationEndsAt: null },
  });

  /* Days booked but not used are given back: somebody who came home early
     should not be charged for the fortnight they did not take. */
  await prisma.memberRest.deleteMany({
    where: { accountId, kind: "vacation", dayKey: { gt: getVancouverDateKey(now) } },
  });

  return { ok: true, shiftedDays, itemsShifted };
}

/**
 * Spends a rest day on a missed day, if there is one to spend.
 *
 * After the fact and automatic: a member should not have to plan being ill.
 */
export async function spendRestDay({
  accountId,
  dayKey,
  now = new Date(),
}: {
  accountId: string;
  dayKey: string;
  now?: Date;
}): Promise<boolean> {
  const standing = await memberRestStanding(accountId, now);
  if (standing.restDaysLeft <= 0) return false;
  await prisma.memberRest.create({ data: { accountId, dayKey, kind: "rest" } }).catch(() => null);
  return true;
}

export { restDaysAllowedAt, vacationWeeksAllowedAt };
