import { resolveDisplayName } from "@/lib/accountIdentity";
import { memberPlacement, rankMemberBoard, type MemberPlacing } from "@/lib/memberBoard";
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

export type XpBoardEntry = MemberPlacing & {
  id: string;
  name: string;
  /** The address their pages live at, or null for an account with neither. */
  address: string | null;
  xp: number;
  rankName: string;
  standing: XpStanding;
};

/**
 * The board, best first.
 *
 * The placing itself is `rankMemberBoard`, which every board shares: equal
 * totals share a place, the next one skips, the repeats of a tie are marked so
 * the number is not printed twice, and each row carries the distance to the
 * member above it. What is left here is the XP-specific half - the rank name
 * and the standing within it.
 */
export function rankXpBoard(accounts: readonly XpBoardAccount[]): XpBoardEntry[] {
  const placed = rankMemberBoard(accounts, {
    score: (account) => account.xp,
    tiebreak: (account) => resolveDisplayName(account),
  });

  return placed.map((account) => {
    const standing = xpStanding(account.xp);
    return {
      id: account.id,
      place: account.place,
      sharesPlace: account.sharesPlace,
      toPassAbove: account.toPassAbove,
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
  return memberPlacement(entries, accountId);
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
