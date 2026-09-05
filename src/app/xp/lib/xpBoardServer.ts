import "server-only";

import { listableTo } from "@/lib/accountListing";
import type { Viewer } from "@/lib/accountVisibility";
import { prisma } from "@/lib/prisma";

import { rankXpBoard, type XpBoardEntry } from "./xpBoard";

/**
 * The rows the XP board ranks, for one viewer.
 *
 * The difference from `loadLeaderboardAccounts` is the whole reason this board
 * exists: that one ends in `onlyConnected`, so a member without a WaniKani
 * token is not on it and cannot be. XP is earned by turning up, from the first
 * day, whether or not anything has ever been synced — so the only filter here
 * is the one about who may be seen at all.
 *
 * That filter is `listableTo` rather than a hand-written `where`, for the
 * reason its own comment gives: approval, the member's visibility choice and
 * whether an admin has switched the account off are three separate gates, and
 * a board that restates them is a board that eventually disagrees with the
 * others. The last two of those three are what `isAccountBarred` composes;
 * asking `listableTo` gets them *and* the visibility gate, which a barred check
 * on its own would miss.
 */
export async function loadXpBoard(viewer: Viewer): Promise<XpBoardEntry[]> {
  const accounts = await prisma.account.findMany({
    orderBy: [{ xp: "desc" }],
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

  return rankXpBoard(listableTo(accounts, viewer));
}
