/**
 * Whether the access screen's way out actually leads anywhere.
 *
 * The screen offers "Back to leaderboard", pointing at the home page. But the
 * home page redirects a signed-in viewer with no linked account straight to
 * /join - which is the page they are reading - so for exactly the people that
 * screen exists to help, the link returned them to where they stood.
 *
 * This mirrors the home page's own condition. The two must agree: if home
 * stops redirecting, or starts redirecting someone new, this has to move with
 * it, and the tests spell that pairing out.
 */
export function canReachLeaderboard(viewer: {
  isSignedIn: boolean;
  isAdmin: boolean;
  hasLinkedAccount: boolean;
  hasInviteSession: boolean;
}): boolean {
  const { isSignedIn, isAdmin, hasLinkedAccount, hasInviteSession } = viewer;
  return !isSignedIn || isAdmin || hasLinkedAccount || hasInviteSession;
}
