import "server-only";

import { getVancouverDateKey } from "@/lib/dailySnapshot";
import { prisma } from "@/lib/prisma";

import {
  MAX_TIME_OFF_GRANT_DAYS,
  restDaysAllowedAt,
  restStanding,
  vacationWeeksAllowedAt,
  type RestStanding,
} from "./xpRest";
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

/**
 * Days off used in the rolling year, which is the window the allowance is for.
 *
 * Grants are counted in the same window as usage, deliberately. The allowance
 * is a rolling-year allowance, so a grant that never expired would be sitting
 * in a different time model from the thing it tops up: a standing +7 would
 * have quietly been +14 of latitude after two years while every screen still
 * said seven. A grant covers the year it was made for; another year wants
 * another decision.
 */
export async function memberRestStanding(accountId: string, now = new Date()): Promise<RestStanding> {
  const since = new Date(now.getTime() - ROLLING_YEAR_DAYS * MS_PER_DAY);
  const [account, used, granted] = await Promise.all([
    prisma.account.findUnique({
      where: { id: accountId },
      select: { xpLevel: true, vacationStartedAt: true, vacationEndsAt: true },
    }),
    prisma.memberRest.groupBy({
      by: ["kind"],
      where: { accountId, createdAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.memberRestGrant.groupBy({
      by: ["kind"],
      where: { accountId, createdAt: { gte: since } },
      _sum: { days: true },
    }),
  ]);

  const rules = await timeOffRules();
  const count = (kind: string) => used.find((row) => row.kind === kind)?._count._all ?? 0;
  const grant = (kind: string) => granted.find((row) => row.kind === kind)?._sum.days ?? 0;
  const xpLevel = account?.xpLevel ?? 1;

  /* Recomputed against the live rules rather than the constants, which are
     only the defaults a fresh environment starts with. */
  const restDaysEarned = restDaysAllowedAt(xpLevel, rules.restDays);
  const vacationWeeksAllowed = vacationWeeksAllowedAt(xpLevel, rules.vacationWeeks);
  const vacationDaysEarned = vacationWeeksAllowed * 7;
  const restDaysAllowed = restDaysEarned + grant("rest");
  const vacationDaysAllowed = vacationDaysEarned + grant("vacation");

  return {
    ...restStanding({
      xpLevel,
      restDaysUsed: count("rest"),
      vacationDaysUsed: count("vacation"),
      onVacation: account?.vacationEndsAt !== null && (account?.vacationEndsAt ?? new Date(0)) > now,
      restDaysGranted: grant("rest"),
      vacationDaysGranted: grant("vacation"),
    }),
    restDaysEarned,
    restDaysAllowed,
    restDaysLeft: Math.max(0, restDaysAllowed - count("rest")),
    vacationWeeksAllowed,
    vacationDaysEarned,
    vacationDaysAllowed,
    vacationDaysLeft: Math.max(0, vacationDaysAllowed - count("vacation")),
  };
}

export type TimeOffGrant = {
  id: string;
  kind: "rest" | "vacation";
  days: number;
  note: string | null;
  grantedBy: string | null;
  createdAt: Date;
  /** False once the rolling year has moved past it, so a reader can see why
      a grant stopped counting rather than watching it vanish. */
  counting: boolean;
};

/** Every grant this member has been given, newest first. */
export async function memberTimeOffGrants(accountId: string, now = new Date()): Promise<TimeOffGrant[]> {
  const since = new Date(now.getTime() - ROLLING_YEAR_DAYS * MS_PER_DAY);
  const rows = await prisma.memberRestGrant.findMany({
    where: { accountId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, kind: true, days: true, note: true, grantedBy: true, createdAt: true },
  });
  return rows.map((row) => ({ ...row, counting: row.createdAt >= since }));
}

/**
 * Hands a member extra days off, on top of what their rank earns.
 *
 * Additive and audited: the row records which admin, when and why, and it
 * composes with the ladder rather than replacing it, so a grant does not stop
 * a member benefiting from the rank they climb to next or from a later retune
 * of the rules. Undoing one is deleting the row, not granting a negative.
 */
export async function grantTimeOff({
  accountId,
  kind,
  days,
  note,
  grantedBy,
}: {
  accountId: string;
  kind: "rest" | "vacation";
  days: number;
  note?: string | null;
  grantedBy?: string | null;
}): Promise<{ ok: true; standing: RestStanding } | { ok: false; refusal: "outOfRange" }> {
  if (!Number.isInteger(days) || days < 1 || days > MAX_TIME_OFF_GRANT_DAYS) {
    return { ok: false, refusal: "outOfRange" };
  }
  await prisma.memberRestGrant.create({
    data: { accountId, kind, days, note: note?.trim() || null, grantedBy: grantedBy ?? null },
  });
  return { ok: true, standing: await memberRestStanding(accountId) };
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
