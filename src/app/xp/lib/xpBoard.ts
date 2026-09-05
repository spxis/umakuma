import { resolveDisplayName } from "@/lib/accountIdentity";
import { xpRankName } from "@/lib/xp/xpRanks";
import { xpStanding, type XpStanding } from "@/lib/xp/xpCurve";

/**
 * Ordering the XP board, and nothing else.
 *
 * Kept pure and away from the database on purpose: who may be *listed* is
 * `listableTo`'s decision and lives in `accountListing.ts`, and what a rank is
 * called is `xpRanks.ts`. What is left is the arithmetic of a placing, which is
 * the one part with an edge case worth a test — two members on the same total.
 *
 * Ties share a place and the next placing skips, the way a race is scored: two
 * members on 1,200 XP are both second and the next is fourth. The alternative
 * (dense ranking, where the next is third) reads as though somebody was
 * overtaken by a total they matched.
 */

export type XpBoardAccount = {
  id: string;
  slug: string | null;
  nickname: string | null;
  displayName: string | null;
  wkUsername: string | null;
  xp: number;
};

export type XpBoardEntry = {
  id: string;
  /** Competition placing: equal totals share it, and the next one skips. */
  place: number;
  name: string;
  /** The address their pages live at, or null for an account with neither. */
  address: string | null;
  xp: number;
  rankName: string;
  standing: XpStanding;
};

/** The board, best first. */
export function rankXpBoard(accounts: readonly XpBoardAccount[]): XpBoardEntry[] {
  const sorted = [...accounts].sort(
    (left, right) =>
      right.xp - left.xp || resolveDisplayName(left).localeCompare(resolveDisplayName(right)),
  );

  let place = 0;
  let previousXp: number | null = null;

  return sorted.map((account, index) => {
    if (previousXp === null || account.xp !== previousXp) {
      place = index + 1;
      previousXp = account.xp;
    }

    const standing = xpStanding(account.xp);
    return {
      id: account.id,
      place,
      name: resolveDisplayName(account),
      address: account.slug ?? account.wkUsername ?? null,
      xp: account.xp,
      rankName: xpRankName(standing.level),
      standing,
    };
  });
}

/** Where one account stands on a board already ranked, or null when it is not on it. */
export function xpBoardPlacement(
  entries: readonly XpBoardEntry[],
  accountId: string | null,
): XpBoardEntry | null {
  if (!accountId) return null;
  return entries.find((entry) => entry.id === accountId) ?? null;
}

/**
 * Whether this viewer may open the member page behind a row.
 *
 * The same rule the WaniKani board follows: your own row and, for an admin,
 * everybody's. A name on a board is not an invitation into somebody's pages.
 */
export function canOpenXpBoardRow(
  entry: XpBoardEntry,
  viewer: { isAdmin: boolean; address: string | null },
): boolean {
  if (!entry.address) return false;
  if (viewer.isAdmin) return true;
  const normalized = viewer.address?.trim().toLowerCase() ?? null;
  return normalized !== null && entry.address.trim().toLowerCase() === normalized;
}
