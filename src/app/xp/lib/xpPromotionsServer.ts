import "server-only";

import { resolveDisplayName } from "@/lib/accountIdentity";
import { listableTo } from "@/lib/accountListing";
import type { Viewer } from "@/lib/accountVisibility";
import { prisma } from "@/lib/prisma";
import { promotionsWithin } from "@/lib/xp/xpPromotion";
import { xpRank } from "@/lib/xp/xpRanks";

/**
 * Who climbed a rank in the last few days.
 *
 * SPX's Promotions page was headed "Promotion Chart for the Past 7 Days" and
 * grouped by level, and the seven-day window is what keeps it short and always
 * current rather than an ever-growing list nobody scrolls.
 *
 * Two reads, both bounded by the window rather than by history: the accounts
 * that may be listed, and their earning inside those days. No promotion table
 * - `Account.xp` is the sum of its events by construction, so replaying the
 * window backwards off the current total is exact. A table for something
 * recomputable is the wrong trade.
 */
export const XP_PROMOTION_WINDOW_DAYS = 7;

export type XpPromotionRow = {
  id: string;
  name: string;
  address: string | null;
  level: number;
  rankName: string;
  dayKey: string;
  xp: number;
};

export type XpPromotionGroup = {
  level: number;
  rankName: string;
  needs: number;
  members: XpPromotionRow[];
};

export async function loadXpPromotions(
  viewer: Viewer,
  since: string,
): Promise<XpPromotionGroup[]> {
  const accounts = await prisma.account.findMany({
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

  const listable = listableTo(accounts, viewer);
  if (listable.length === 0) return [];

  const days = await prisma.xpEvent.groupBy({
    by: ["accountId", "dayKey"],
    where: { accountId: { in: listable.map((account) => account.id) }, dayKey: { gte: since } },
    _sum: { amount: true },
  });

  /* Newest first, because the walk subtracts days back off the current total. */
  const byAccount = new Map<string, { dayKey: string; amount: number }[]>();
  for (const row of days) {
    const list = byAccount.get(row.accountId) ?? [];
    list.push({ dayKey: row.dayKey, amount: row._sum.amount ?? 0 });
    byAccount.set(row.accountId, list);
  }
  for (const list of byAccount.values()) {
    list.sort((left, right) => right.dayKey.localeCompare(left.dayKey));
  }

  const groups = new Map<number, XpPromotionGroup>();
  for (const account of listable) {
    for (const promotion of promotionsWithin(account.xp, byAccount.get(account.id) ?? [])) {
      const rank = xpRank(promotion.level);
      const group = groups.get(promotion.level) ?? {
        level: promotion.level,
        rankName: rank.name,
        needs: 0,
        members: [],
      };
      group.members.push({
        id: account.id,
        name: resolveDisplayName(account),
        address: account.slug ?? account.wkUsername ?? null,
        level: promotion.level,
        rankName: rank.name,
        dayKey: promotion.dayKey,
        xp: account.xp,
      });
      groups.set(promotion.level, group);
    }
  }

  /* Highest rank first, the way SPX ordered its chart: the biggest climb of
     the week is the one worth reading first. */
  return [...groups.values()]
    .sort((left, right) => right.level - left.level)
    .map((group) => ({
      ...group,
      members: group.members.sort(
        (left, right) => right.dayKey.localeCompare(left.dayKey) || left.name.localeCompare(right.name),
      ),
    }));
}
