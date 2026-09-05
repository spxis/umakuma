import { isLockedOut } from "./accountApproval";

/**
 * Whether an account may be used at all, whatever the reason it may not.
 *
 * Two things can stop an account, and they are not the same thing. Rejection
 * is the answer at the door: this person was never let in. Disabling is what
 * happens to somebody already inside - an account being reissued, a member who
 * asked for a break, an abuse report being looked at - and it is reversible
 * without touching the approval history.
 *
 * Every entrance asks *this* rather than either half, for the reason the map
 * countries taught: a second list of who may not come in always drifts from
 * the first, and the drift shows up as a door somebody forgot to lock. The
 * study routes, the invite session, the user page and the leaderboard all read
 * the same predicate over the same two columns.
 */

/** The columns any standing decision is made from. */
export const ACCOUNT_STANDING_SELECT = {
  approvalStatus: true,
  disabledAt: true,
} as const;

export type AccountStandingFields = {
  approvalStatus: string | null;
  /** A `Date` from Prisma, a string once it has been through JSON. */
  disabledAt: Date | string | null;
};

/** Whether an admin has switched this account off. */
export function isAccountDisabled(disabledAt: Date | string | null | undefined): boolean {
  return Boolean(disabledAt);
}

/**
 * Whether this account is barred: turned away at the door, or switched off
 * since. The one question every entrance asks.
 */
export function isAccountBarred(account: AccountStandingFields): boolean {
  return isLockedOut(account.approvalStatus) || isAccountDisabled(account.disabledAt);
}
