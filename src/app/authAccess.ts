import { type SignupSettings, allowsSelfSignup } from "@/lib/signupSettings";

/** The only page that creates an account. */
export const WELCOME_HREF = "/welcome";
/** The invite form, for when the door is shut. */
export const JOIN_HREF = "/join";

/**
 * Where a signed-in viewer with no account of their own belongs.
 *
 * Signing in with Google proves who someone is; it does not make them a
 * member. When signup is open, the next step is the page that creates the
 * account, and nothing else is the right answer - the home page, the sign-in
 * screen and the invite form itself all used to send this viewer to the
 * invite form, so a new Google user with the door wide open stood at "Join
 * with invite code" with no code and no way on, and a refresh kept them
 * there. When signup is invite only, the invite form is the right place.
 *
 * `null` for everyone else: a member goes to their own page, an admin is never
 * turned away, a signed-out visitor is not a newcomer yet.
 */
export function newcomerLanding(
  viewer: { isSignedIn: boolean; isAdmin: boolean; hasLinkedAccount: boolean },
  settings: SignupSettings,
): string | null {
  if (!viewer.isSignedIn || viewer.isAdmin || viewer.hasLinkedAccount) return null;
  return allowsSelfSignup(settings) ? WELCOME_HREF : JOIN_HREF;
}

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

/**
 * Where /login sends someone who is already signed in.
 *
 * Asking for the login page means "let me in", so it honours where they were
 * headed and otherwise hands over to /join, which routes a member to their own
 * page and someone with no account to the invite form. It used to redirect to
 * /logout, answering a request to sign in with an offer to sign out.
 */
export function signedInLoginTarget(callbackUrl: string): string {
  return callbackUrl === "/" ? "/join" : callbackUrl;
}
