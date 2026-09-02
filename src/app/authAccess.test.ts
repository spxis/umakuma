import { describe, expect, it } from "vitest";

import { canReachLeaderboard, newcomerLanding, signedInLoginTarget } from "./authAccess";
import { SIGNUP_MODES, SIGNUP_SETTING_DEFAULTS, type SignupSettings } from "@/lib/signupSettings";

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

describe("newcomerLanding", () => {
  const open: SignupSettings = { ...SIGNUP_SETTING_DEFAULTS, mode: SIGNUP_MODES.openImmediate };
  const pending: SignupSettings = { ...SIGNUP_SETTING_DEFAULTS, mode: SIGNUP_MODES.openPending };
  const closed: SignupSettings = { ...SIGNUP_SETTING_DEFAULTS, mode: SIGNUP_MODES.inviteOnly };
  const newcomer = { isSignedIn: true, isAdmin: false, hasLinkedAccount: false };

  /*
   * The bug: the site was open to anyone, a new Google user signed in, and
   * every page sent them to the invite form - which asks for a code nobody
   * had given them.
   */
  it("sends a new Google user to the page that creates their account when signup is open", () => {
    expect(newcomerLanding(newcomer, open)).toBe("/welcome");
    expect(newcomerLanding(newcomer, pending)).toBe("/welcome");
  });

  it("never lands them on the invite form while the door is open", () => {
    expect(newcomerLanding(newcomer, open)).not.toBe("/join");
  });

  it("sends them to the invite form only when signup is invite only", () => {
    expect(newcomerLanding(newcomer, closed)).toBe("/join");
  });

  it("has nothing to say about a member, an admin or a signed-out visitor", () => {
    expect(newcomerLanding({ ...newcomer, hasLinkedAccount: true }, open)).toBeNull();
    expect(newcomerLanding({ ...newcomer, isAdmin: true }, open)).toBeNull();
    expect(newcomerLanding({ ...newcomer, isSignedIn: false }, open)).toBeNull();
  });
});

describe("signedInLoginTarget", () => {
  it("never answers a request to sign in with a sign-out screen", () => {
    expect(signedInLoginTarget("/")).not.toContain("logout");
    expect(signedInLoginTarget("/")).not.toContain("signout");
  });

  it("hands over to /join, which routes members and newcomers differently", () => {
    expect(signedInLoginTarget("/")).toBe("/join");
  });

  it("keeps the page they were trying to reach", () => {
    expect(signedInLoginTarget("/users/gwen-chen/game")).toBe("/users/gwen-chen/game");
  });
});
