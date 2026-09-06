import "server-only";

import { NextResponse } from "next/server";

import { getVancouverDateKey } from "@/lib/dailySnapshot";
import { prisma } from "@/lib/prisma";
import { summariseXpActivity } from "@/lib/xp/xpActivity";
import { memberRestStanding, memberTimeOffGrants, protectedDayKeys } from "@/lib/xp/xpRestServer";
import { xpEarnedToday } from "@/lib/xp/xpServer";
import { xpRankName } from "@/lib/xp/xpRanks";
import { xpStanding } from "@/lib/xp/xpCurve";

import type {
  AdminAccountDetail,
  AdminAccountDetailPayload,
  AdminXpTypeOption,
} from "./adminAccountDetail.types";

/**
 * Everything the admin's screen for one member is drawn from, in one read.
 *
 * The page needs the account, the awards that exist, and what this member has
 * already earned today of each of them - and it needs the third to make sense
 * of the first two, since an admin award of a capped kind eats into what the
 * member's own study can still earn that day. Fetching them together is what
 * lets the form show the cap and the day's total beside the amount field
 * rather than leaving the admin to guess.
 *
 * The WaniKani token columns are not selected. They are encrypted at rest and
 * there is no admin question they answer: whether a member is connected is
 * `wkUsername`, and that is on the row already.
 */
export async function loadAdminAccountDetail(accountId: string): Promise<AdminAccountDetailPayload | null> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: {
      id: true,
      nickname: true,
      slug: true,
      displayName: true,
      joinedByName: true,
      joinedByEmail: true,
      visibility: true,
      internal: true,
      approvalStatus: true,
      approvedAt: true,
      disabledAt: true,
      disabledReason: true,
      disabledBy: true,
      inviteCodeHash: true,
      inviteCodeUpdatedAt: true,
      wkUsername: true,
      wkLevel: true,
      unLevel: true,
      unLevelFloor: true,
      unPlacedAt: true,
      unPlacementSource: true,
      srsTheme: true,
      ageBand: true,
      jlptStatus: true,
      xp: true,
      xpLevel: true,
      score: true,
      pendingReviews: true,
      lastSyncedAt: true,
      lastSyncStatus: true,
      lastSyncError: true,
      lastActivityAt: true,
      createdAt: true,
      vacationStartedAt: true,
      vacationEndsAt: true,
    },
  });

  if (!account) {
    return null;
  }

  const [types, earnedToday, recentEvents, everyDay, protectedDays, rest, grants] = await Promise.all([
    prisma.xpType.findMany({
      orderBy: [{ retiredAt: "asc" }, { label: "asc" }],
      select: { id: true, label: true, note: true, amount: true, dailyCap: true, retiredAt: true },
    }),
    xpEarnedToday(accountId),
    prisma.xpEvent.findMany({
      where: { accountId },
      orderBy: { updatedAt: "desc" },
      take: 12,
      select: { id: true, kind: true, amount: true, dayKey: true, note: true, updatedAt: true },
    }),
    /* Every row, not a page of them: the streak and the activity summary are
       derived from the whole history, and one member's rows are bounded by the
       days they have used the site rather than by anything that grows with the
       size of the site. */
    prisma.xpEvent.findMany({
      where: { accountId },
      select: { dayKey: true, kind: true, amount: true },
    }),
    protectedDayKeys(accountId),
    memberRestStanding(accountId),
    memberTimeOffGrants(accountId),
  ]);

  /* The protected days go in, so the streak here is the streak the member is
     shown on their own page. An admin reading a shorter number than the member
     is looking at is a disagreement nobody can debug from a screenshot. */
  const activity = summariseXpActivity(everyDay, getVancouverDateKey(new Date()), protectedDays);

  const standing = xpStanding(account.xp);

  const detail: AdminAccountDetail = {
    id: account.id,
    nickname: account.nickname,
    slug: account.slug,
    displayName: account.displayName,
    joinedByName: account.joinedByName,
    joinedByEmail: account.joinedByEmail,
    visibility: account.visibility,
    internal: account.internal,
    approvalStatus: account.approvalStatus,
    approvedAt: account.approvedAt?.toISOString() ?? null,
    disabledAt: account.disabledAt?.toISOString() ?? null,
    disabledReason: account.disabledReason,
    disabledBy: account.disabledBy,
    hasInviteCode: Boolean(account.inviteCodeHash),
    inviteCodeUpdatedAt: account.inviteCodeUpdatedAt?.toISOString() ?? null,
    wkUsername: account.wkUsername,
    wkLevel: account.wkLevel,
    unLevel: account.unLevel,
    unLevelFloor: account.unLevelFloor,
    unPlacedAt: account.unPlacedAt?.toISOString() ?? null,
    unPlacementSource: account.unPlacementSource,
    srsTheme: account.srsTheme,
    ageBand: account.ageBand,
    jlptStatus: account.jlptStatus,
    xp: account.xp,
    xpLevel: account.xpLevel,
    xpRankName: xpRankName(account.xpLevel),
    xpIntoLevel: standing.into,
    xpLevelSpan: standing.span,
    score: account.score,
    pendingReviews: account.pendingReviews,
    lastSyncedAt: account.lastSyncedAt.toISOString(),
    lastSyncStatus: account.lastSyncStatus,
    lastSyncError: account.lastSyncError,
    lastActivityAt: account.lastActivityAt?.toISOString() ?? null,
    createdAt: account.createdAt.toISOString(),
  };

  const xpTypes: AdminXpTypeOption[] = types.map((type) => ({
    id: type.id,
    label: type.label,
    note: type.note,
    amount: type.amount,
    dailyCap: type.dailyCap,
    retired: type.retiredAt !== null,
    earnedToday: earnedToday[type.id] ?? 0,
  }));

  return {
    account: detail,
    xpTypes,
    recentXpEvents: recentEvents.map((event) => ({
      id: event.id,
      kind: event.kind,
      amount: event.amount,
      dayKey: event.dayKey,
      note: event.note,
      updatedAt: event.updatedAt.toISOString(),
    })),
    activity: {
      currentStreak: activity.streak.current,
      longestStreak: activity.streak.longest,
      activeToday: activity.streak.activeToday,
      lastActiveDay: activity.streak.lastActiveDay,
      daysSinceLastActive: activity.daysSinceLastActive,
      daysActive: activity.daysActive,
      totalXp: activity.totalXp,
      averagePerActiveDay: activity.averagePerActiveDay,
      bestDay: activity.bestDay,
    },
    rest: {
      ...rest,
      vacationStartedAt: account.vacationStartedAt?.toISOString() ?? null,
      vacationEndsAt: account.vacationEndsAt?.toISOString() ?? null,
    },
    restGrants: grants.map((grant) => ({
      id: grant.id,
      kind: grant.kind,
      days: grant.days,
      note: grant.note,
      grantedBy: grant.grantedBy,
      createdAt: grant.createdAt.toISOString(),
      counting: grant.counting,
    })),
  };
}

/**
 * The whole detail as a route's answer, or a 404.
 *
 * Every mutating route on this screen re-reads and returns the detail, so the
 * client never has to guess what the write did. This is that re-read plus the
 * one case worth handling: the row was deleted between the write and the read,
 * which would otherwise hand the client a payload with no account on it and
 * crash the page rather than saying what happened.
 */
export async function adminAccountDetailResponse(accountId: string, extra?: Record<string, unknown>) {
  const payload = await loadAdminAccountDetail(accountId);
  if (!payload) {
    return NextResponse.json({ error: "No such account." }, { status: 404 });
  }
  return NextResponse.json(extra ? { ...payload, ...extra } : payload);
}
