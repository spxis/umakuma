import "server-only";

import { listableTo } from "@/lib/accountListing";
import { resolveDisplayName } from "@/lib/accountIdentity";
import type { Viewer } from "@/lib/accountVisibility";
import { rankMemberBoard, type MemberPlaced } from "@/lib/memberBoard";
import { prisma } from "@/lib/prisma";
import type { XpWeek } from "@/lib/xp/xpWeek";

/**
 * Who earned the most in one week.
 *
 * The board a newcomer can win, and the reason it is worth having beside the
 * lifetime one: SPX's capture has MoR sitting second on 137 earned that week
 * with 3,227 lifetime, while TOGiants leads on 191 earned with 1,389. The
 * inversion is the whole point - a member who joined last month is not racing
 * three years of somebody else's history.
 *
 * Only members who earned something appear. A week is a thing you turned up
 * for or did not, and listing everybody on nought would bury the four people
 * who did behind a page of zeroes.
 */
export type XpWeeklyEntry = MemberPlaced<{
  id: string;
  name: string;
  address: string | null;
  /** Earned inside the week. What the board is ranked by. */
  earned: number;
  /** Lifetime, shown beside it so the inversion is visible rather than implied. */
  total: number;
}>;

export async function loadXpWeekly(viewer: Viewer, week: XpWeek): Promise<XpWeeklyEntry[]> {
  const earned = await prisma.xpEvent.groupBy({
    by: ["accountId"],
    where: { dayKey: { gte: week.startDayKey, lte: week.endDayKey } },
    _sum: { amount: true },
  });

  if (earned.length === 0) return [];

  const accounts = await prisma.account.findMany({
    where: { id: { in: earned.map((row) => row.accountId) } },
    select: {
      id: true,
      slug: true,
      nickname: true,
      displayName: true,
      wkUsername: true,
      xp: true,
      visibility: true,
      approvalStatus: true,
      disabledAt: true,
    },
  });

  /* The same gate every other board uses. A private member is no more listed
     here for one good week than they are on the lifetime board. */
  const listable = listableTo(accounts, viewer);
  const weekly = new Map(earned.map((row) => [row.accountId, row._sum.amount ?? 0]));

  return rankMemberBoard(
    listable.map((account) => ({
      id: account.id,
      name: resolveDisplayName(account),
      address: account.slug ?? account.wkUsername ?? null,
      earned: weekly.get(account.id) ?? 0,
      total: account.xp,
    })),
    { score: (row) => row.earned, tiebreak: (row) => row.name },
  );
}
