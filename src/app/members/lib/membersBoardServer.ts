import "server-only";

import { listableTo } from "@/lib/accountListing";
import type { Viewer } from "@/lib/accountVisibility";
import { prisma } from "@/lib/prisma";

import { membersNewestFirst, type MembersBoardEntry } from "./membersBoard";

/**
 * The members a viewer may see, newest first.
 *
 * `listableTo` decides who is listed - approval, the member's own visibility
 * choice, and whether an admin has switched the account off - for the reason
 * its comment gives: three gates restated per board is how a private member
 * ends up listed somewhere. What is left is ordered by `membersNewestFirst`.
 */
export async function loadMembersBoard(viewer: Viewer): Promise<MembersBoardEntry[]> {
  const accounts = await prisma.account.findMany({
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      slug: true,
      nickname: true,
      displayName: true,
      wkUsername: true,
      wkLevel: true,
      unLevel: true,
      createdAt: true,
      userType: true,
      visibility: true,
      approvalStatus: true,
      disabledAt: true,
    },
  });
  return membersNewestFirst(listableTo(accounts, viewer));
}
