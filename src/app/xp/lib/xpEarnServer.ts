import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Every way to earn XP, read from the table the awards are actually paid from.
 *
 * SPX had a How to Gain XP page and it was a plain list of sources with their
 * numbers on it - the useful thing about it being that the odds were written
 * down rather than left to be inferred. Ours can do better than a written list
 * because the prices are data: `XpType` is what `awardXp` charges against, and
 * an admin can retune any of it from the site. A hand-written page would be
 * wrong the first time somebody did.
 *
 * Retired kinds are left out. Their rows stay so old history still explains
 * itself, but a member reading how to earn should not be shown a way that no
 * longer pays.
 */
export type XpEarnRow = {
  id: string;
  label: string;
  note: string;
  amount: number;
  /** Most a day this kind may be worth, or null where there is no ceiling. */
  dailyCap: number | null;
};

export async function loadXpEarnRows(): Promise<XpEarnRow[]> {
  const rows = await prisma.xpType.findMany({
    where: { retiredAt: null },
    orderBy: [{ amount: "desc" }, { label: "asc" }],
    select: { id: true, label: true, note: true, amount: true, dailyCap: true },
  });
  return rows;
}
