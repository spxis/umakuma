import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ACCOUNT_APPROVAL,
  isApproved,
  isAwaitingApproval,
  isLockedOut,
  resolveApproval,
} from "./accountApproval";

/*
 * Rejection used to be nothing but an absence from the leaderboard. The account
 * still opened its own pages, still answered every study and game route, and
 * still held a session - so the admin's only sanction was to make someone
 * invisible to everybody except themselves.
 */
describe("locking out a rejected account", () => {
  it("locks out only the rejected", () => {
    expect(isLockedOut(ACCOUNT_APPROVAL.rejected)).toBe(true);
    expect(isLockedOut(ACCOUNT_APPROVAL.approved)).toBe(false);
    expect(isLockedOut(ACCOUNT_APPROVAL.pending)).toBe(false);
  });

  /*
   * The distinction the whole feature rests on. Waiting is not the same as
   * being turned away: the signup copy promises a pending member they can look
   * around, so a lock written as `!isApproved` would break that promise.
   */
  it("leaves a member who is merely waiting with their access", () => {
    expect(isApproved(ACCOUNT_APPROVAL.pending)).toBe(false);
    expect(isLockedOut(ACCOUNT_APPROVAL.pending)).toBe(false);
    expect(isAwaitingApproval(ACCOUNT_APPROVAL.pending)).toBe(true);
  });

  /*
   * Accounts predating the column, and anything unrecognized, read as approved.
   * A lock that defaulted the other way would have shut out the whole family on
   * deploy - the failure this codebase has already had once, with visibility.
   */
  it("never locks out an account with nothing stored", () => {
    expect(isLockedOut(null)).toBe(false);
    expect(isLockedOut(undefined)).toBe(false);
    expect(isLockedOut("")).toBe(false);
    expect(isLockedOut("something-else-entirely")).toBe(false);
    expect(resolveApproval(null)).toBe(ACCOUNT_APPROVAL.approved);
  });
});

/*
 * A lock is only as good as the places that consult it, and this one has four
 * doors: the API's owner check, the page-level viewer resolution, the invite
 * cookie, and signup. Each was found open. Reading the sources keeps a later
 * refactor from quietly closing one of them off from the check.
 */
describe("the doors the lock has to cover", () => {
  const doors = [
    ["src/lib/accountAccess.ts", "every /api/study and /api/custom-study route"],
    ["src/app/users/[nickname]/userPageAuth.ts", "the user pages and the header"],
    ["src/app/api/invite/session/route.ts", "signing in with an invite code"],
    ["src/app/api/signup/route.ts", "signing up again with the same email"],
  ] as const;

  it.each(doors)("%s consults the lock, for %s", (path) => {
    const source = readFileSync(join(process.cwd(), path), "utf8");
    expect(source).toContain("isLockedOut");
    // Reading the column is the other half: a check on a field the query never
    // selected is undefined, and undefined reads as approved.
    expect(source).toContain("approvalStatus");
  });
});
