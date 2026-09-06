import { isApproved } from "./accountApproval";
import { type AccountStandingFields, isAccountDisabled } from "./accountStanding";
import { type Viewer, isVisibleTo } from "./accountVisibility";

export type ListableAccount = AccountStandingFields & {
  visibility: string | null;
};

/**
 * Which accounts a viewer may see listed.
 *
 * Three independent gates, and all of them have to pass. Approval is the
 * admin's decision at the door and visibility is the member's own, so a member
 * who chose Public still does not appear while they are waiting, and an
 * approved member who chose Private still does not appear at all. Being
 * switched off is the third: an admin who disables an account has to see it
 * leave the boards, or disabling is a note in a database rather than an act.
 *
 * An admin sees a private member, because they moderate the place - but not a
 * disabled one, since the whole point of the switch is that this account is
 * out of play until it is switched back.
 *
 * Kept here rather than in each query because a leaderboard, a scoreboard and
 * a search result are all the same question, and one of them forgetting is how
 * a private member ends up listed anyway.
 */
export function listableTo<T extends ListableAccount>(accounts: readonly T[], viewer: Viewer): T[] {
  return accounts.filter(
    (account) =>
      isApproved(account.approvalStatus) &&
      !isAccountDisabled(account.disabledAt) &&
      isVisibleTo(account.visibility, viewer),
  );
}

/**
 * What an admin has asked to be treated as, for this one page load.
 *
 * An admin sees private members on every board, and until now had no way to
 * check what an ordinary member or a stranger sees - which is the only way to
 * answer "is this person actually hidden". `?as=public` and `?as=member`
 * answer it.
 *
 * **It only ever removes.** The override is read from the query string, which
 * is whatever somebody typed, so it is gated on `isAdmin` and its values are a
 * closed set of *lower* standings. Nobody can promote themselves by typing
 * `?as=admin`; there is no such value, and a non-admin passing anything at all
 * is ignored.
 */
export const VIEWER_PREVIEWS = { public: "anonymous", member: "member" } as const;

export type ViewerPreview = keyof typeof VIEWER_PREVIEWS;

export function isViewerPreview(value: unknown): value is ViewerPreview {
  return typeof value === "string" && value in VIEWER_PREVIEWS;
}

/**
 * What kind of viewer is asking.
 *
 * A member is someone with an account of their own, not merely someone signed
 * in: a signed-in visitor with no account has no more claim on other people's
 * names than an anonymous one.
 *
 * Every board funnels through here, which is why the preview belongs here
 * rather than in each of them: one place decides who is asking, so one place
 * can be asked to pretend.
 */
export function viewerKind(input: {
  isAdmin: boolean;
  hasAccount: boolean;
  /** Ignored for anyone who is not an admin. */
  previewAs?: string | null;
}): Viewer {
  if (input.isAdmin) {
    if (isViewerPreview(input.previewAs)) return VIEWER_PREVIEWS[input.previewAs];
    return "admin";
  }
  return input.hasAccount ? "member" : "anonymous";
}
