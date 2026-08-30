import { describe, expect, it } from "vitest";

import { canReachLeaderboard } from "./authAccess";

const viewer = (overrides: Partial<Parameters<typeof canReachLeaderboard>[0]> = {}) => ({
  isSignedIn: false,
  isAdmin: false,
  hasLinkedAccount: false,
  hasInviteSession: false,
  ...overrides,
});

describe("canReachLeaderboard", () => {
  it("lets a signed-out visitor go to the leaderboard, which is public", () => {
    expect(canReachLeaderboard(viewer())).toBe(true);
  });

  /*
   * The case the link was broken for. Home redirects this viewer to /join, so
   * the button on /join sent them back to /join and looked like it did nothing.
   */
  it("hides the way out from a signed-in viewer with no account", () => {
    expect(canReachLeaderboard(viewer({ isSignedIn: true }))).toBe(false);
  });

  it("keeps it for a member who has an account to go back to", () => {
    expect(canReachLeaderboard(viewer({ isSignedIn: true, hasLinkedAccount: true }))).toBe(true);
  });

  it("keeps it for someone signed in with an invite code", () => {
    expect(canReachLeaderboard(viewer({ isSignedIn: true, hasInviteSession: true }))).toBe(true);
  });

  // An admin is never redirected off home, so the link always works for them.
  it("keeps it for an admin even with no account of their own", () => {
    expect(canReachLeaderboard(viewer({ isSignedIn: true, isAdmin: true }))).toBe(true);
  });
});
