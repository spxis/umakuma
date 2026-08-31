import { isApproved } from "./accountApproval";
import { type Viewer, isVisibleTo } from "./accountVisibility";

export type ListableAccount = {
  visibility: string | null;
  approvalStatus: string | null;
};

/**
 * Which accounts a viewer may see listed.
 *
 * Two independent gates, and both have to pass. Approval is the admin's
 * decision and visibility is the member's own, so a member who chose Public
 * still does not appear while they are waiting, and an approved member who
 * chose Private still does not appear at all.
 *
 * Kept here rather than in each query because a leaderboard, a scoreboard and
 * a search result are all the same question, and one of them forgetting is how
 * a private member ends up listed anyway.
 */
export function listableTo<T extends ListableAccount>(accounts: readonly T[], viewer: Viewer): T[] {
  return accounts.filter(
    (account) => isApproved(account.approvalStatus) && isVisibleTo(account.visibility, viewer),
  );
}

/**
 * What kind of viewer is asking.
 *
 * A member is someone with an account of their own, not merely someone signed
 * in: a signed-in visitor with no account has no more claim on other people's
 * names than an anonymous one.
 */
export function viewerKind(input: { isAdmin: boolean; hasAccount: boolean }): Viewer {
  if (input.isAdmin) return "admin";
  return input.hasAccount ? "member" : "anonymous";
}
