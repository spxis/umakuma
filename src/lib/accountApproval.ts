/**
 * Whether an account has been let in.
 *
 * Separate from visibility, which is the member's own choice. This is the
 * admin's: with open signup anyone can create an account, and approval is what
 * keeps a stranger from appearing on a family's leaderboard the moment they
 * sign in. They can look around while they wait.
 *
 * `null` means an account from before this column, every one of which was
 * already in use, so it reads as approved. Reading it as pending would have
 * put the whole family in a waiting room on deploy.
 */

export const ACCOUNT_APPROVAL = {
  pending: "pending",
  approved: "approved",
  rejected: "rejected",
} as const;

export type AccountApproval = (typeof ACCOUNT_APPROVAL)[keyof typeof ACCOUNT_APPROVAL];
export const ACCOUNT_APPROVAL_VALUES = Object.values(ACCOUNT_APPROVAL);

export function isAccountApproval(value: string): value is AccountApproval {
  return (ACCOUNT_APPROVAL_VALUES as string[]).includes(value);
}

/** Accounts that predate the column were already in use, so they are approved. */
export const LEGACY_APPROVAL: AccountApproval = ACCOUNT_APPROVAL.approved;

export function resolveApproval(stored: string | null | undefined): AccountApproval {
  return stored && isAccountApproval(stored) ? stored : LEGACY_APPROVAL;
}

/** Whether this account counts: listed, ranked, and able to use the site fully. */
export function isApproved(stored: string | null | undefined): boolean {
  return resolveApproval(stored) === ACCOUNT_APPROVAL.approved;
}

/** Whether the member is still waiting, as opposed to turned away. */
export function isAwaitingApproval(stored: string | null | undefined): boolean {
  return resolveApproval(stored) === ACCOUNT_APPROVAL.pending;
}

export const ACCOUNT_APPROVAL_DISPLAY: Record<AccountApproval, string> = {
  [ACCOUNT_APPROVAL.pending]: "Waiting for approval",
  [ACCOUNT_APPROVAL.approved]: "Approved",
  [ACCOUNT_APPROVAL.rejected]: "Not approved",
};
