/**
 * Display preferences the server has to know before it draws.
 *
 * Most preferences can live in `localStorage`, because nothing is wrong with
 * applying them a frame late. A preference that changes what the *first* paint
 * should contain cannot: the server renders the default, the browser reads
 * storage after hydration, and the difference is visible. The grade explorer's
 * quiz mode is the loud case - the server drew every reading and the browser
 * then hid 580 of them, which reads as a flash on arrival.
 *
 * A cookie is the one client value a server component can read, so preferences
 * of that kind live here instead. Small, unsigned and not secret: the worst a
 * forged value can do is show a member their own readings.
 *
 * `localStorage` stays right for everything that does not change the first
 * paint - see `clientStorage.ts`, which is still the default choice.
 */

/** One year. A display preference is not worth asking about again. */
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export const DISPLAY_PREFERENCE_COOKIES = {
  /** Whether the grade explorer hides readings so the grid can be self-tested. */
  gradeReveal: "wr-grades-reveal",
} as const;

/**
 * A cookie value, if it is one of the values the caller accepts.
 *
 * Takes the value rather than the cookie store so it can be tested without
 * Next's request context, and so a caller that already has the store does not
 * pay for a second lookup.
 */
export function readEnumCookie<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  return value !== undefined && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

/**
 * Writes a display preference where the next server render will see it.
 *
 * `SameSite=Lax` because these ride on ordinary navigation and have no reason
 * to travel with a cross-site request; no `Secure`, so it still works on the
 * local dev server over http.
 */
export function writeDisplayPreferenceCookie(name: string, value: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax`;
}
