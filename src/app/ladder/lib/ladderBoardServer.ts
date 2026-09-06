import "server-only";

import { listableTo } from "@/lib/accountListing";
import type { Viewer } from "@/lib/accountVisibility";
import { prisma } from "@/lib/prisma";
import { UN_LEVEL_PASS_SRS_STAGE } from "@/lib/uk/unLevel";

import type { LadderBoardAccount } from "./ladderBoard";

/**
 * The rows the ladder boards rank, for one viewer.
 *
 * Everyone who may be listed, not only the connected: the UmaKuma curriculum
 * is ours and a member climbs it without a WaniKani token, so the only filter
 * is `listableTo` - the same one the XP board uses, and for the same reason
 * its comment gives. Approval, the member's own visibility choice and an
 * admin's switch are three gates, and a board that restates them is a board
 * that eventually disagrees with the others.
 *
 * **One pass over the states, not one per member.** The counts are three
 * grouped queries rather than a query per account: there is no materialised
 * rollup, so a board is a groupBy per render, and forty-two round trips would
 * be forty-two more than it needs. `passedAt` and `burnedAt` carry no index,
 * which is why this is the shape to keep an eye on if the board ever gets
 * slow - the fix then is a column following the `unLevel` precedent, not a
 * loop here.
 */
export async function loadLadderBoard(viewer: Viewer): Promise<LadderBoardAccount[]> {
  const [accounts, learned, passed, burned] = await Promise.all([
    prisma.account.findMany({
      select: {
        id: true,
        slug: true,
        nickname: true,
        displayName: true,
        wkUsername: true,
        ladderStream: true,
        unLevel: true,
        ugLevel: true,
        visibility: true,
        approvalStatus: true,
        disabledAt: true,
      },
    }),
    prisma.ukSrsState.groupBy({ by: ["accountId"], _count: { _all: true } }),
    /* Sticky, matching `hasPassed`: an item that reached Guru counts as passed
       even if it was later answered wrong and fell back a stage. */
    prisma.ukSrsState.groupBy({
      by: ["accountId"],
      where: { OR: [{ passedAt: { not: null } }, { srsStage: { gte: UN_LEVEL_PASS_SRS_STAGE } }] },
      _count: { _all: true },
    }),
    prisma.ukSrsState.groupBy({
      by: ["accountId"],
      where: { burnedAt: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const countsFrom = (rows: { accountId: string; _count: { _all: number } }[]) =>
    new Map(rows.map((row) => [row.accountId, row._count._all]));
  const learnedBy = countsFrom(learned);
  const passedBy = countsFrom(passed);
  const burnedBy = countsFrom(burned);

  return listableTo(accounts, viewer).map((account) => ({
    id: account.id,
    slug: account.slug,
    nickname: account.nickname,
    displayName: account.displayName,
    wkUsername: account.wkUsername,
    stream: account.ladderStream,
    unLevel: account.unLevel,
    ugLevel: account.ugLevel,
    learned: learnedBy.get(account.id) ?? 0,
    passed: passedBy.get(account.id) ?? 0,
    burned: burnedBy.get(account.id) ?? 0,
  }));
}
