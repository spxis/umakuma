/**
 * How this reader likes a sheet drawn, remembered between visits.
 *
 * Every setting lives in the URL, which is what makes a sheet a link somebody
 * can send or bookmark - and it is also why the options looked broken. A
 * worksheet link built for one kanji says what that sheet is and nothing about
 * how the reader likes it, so Show readings came up unticked every time,
 * whatever they had chosen the visit before.
 *
 * So the options are remembered too, and the two are ranked rather than
 * merged: what the address says wins, always, or a link would render
 * differently for the person who sent it and the person who opened it. The
 * memory only answers for the settings the address is silent about.
 *
 * A cookie rather than `localStorage` because the sheet is drawn on the
 * server, and a preference read a frame late would repaint the whole page -
 * see `displayPreferenceCookie.ts`, which is the same argument.
 */

/** One year. How you like a worksheet is not worth asking about again. */
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export const SHEET_PREFERENCE_COOKIE = "wr-sheet-options";

/**
 * The settings that are about how a sheet looks rather than what is on it.
 *
 * Which characters, which page, which mode and whether the chooser is open all
 * belong to the address; these five are the row of controls under it, and they
 * are the same answer for the same reader on any sheet.
 */
export const SHEET_PREFERENCE_KEYS = ["model", "readings", "numbers", "fill", "size"] as const;

export type SheetPreferenceKey = (typeof SHEET_PREFERENCE_KEYS)[number];
export type SheetPreferences = Partial<Record<SheetPreferenceKey, string>>;

function isKey(value: string): value is SheetPreferenceKey {
  return (SHEET_PREFERENCE_KEYS as readonly string[]).includes(value);
}

/**
 * The cookie, as settings. Spelled the way the query is, so one vocabulary
 * covers both and a remembered value can be read exactly where a parameter
 * would have been.
 */
export function readSheetPreferences(raw: string | undefined): SheetPreferences {
  if (!raw) return {};
  const held: SheetPreferences = {};
  for (const [key, value] of new URLSearchParams(raw)) {
    if (isKey(key) && value !== "") held[key] = value;
  }
  return held;
}

/** The settings, as a cookie value. */
export function serialiseSheetPreferences(preferences: SheetPreferences): string {
  const params = new URLSearchParams();
  for (const key of SHEET_PREFERENCE_KEYS) {
    const value = preferences[key];
    if (value !== undefined) params.set(key, value);
  }
  return params.toString();
}

/** What the reader has just chosen, merged over what they had chosen before. */
export function rememberSheetPreference(
  raw: string | undefined,
  change: SheetPreferences,
): string {
  return serialiseSheetPreferences({ ...readSheetPreferences(raw), ...change });
}

/**
 * Writes it where the next server render will see it. Same shape as the
 * display preferences: Lax, no Secure, so the local dev server works too.
 */
export function writeSheetPreferences(value: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${SHEET_PREFERENCE_COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax`;
}

/** The cookie this browser is holding, for a client that is about to change it. */
export function currentSheetPreferenceCookie(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.split("; ").find((row) => row.startsWith(`${SHEET_PREFERENCE_COOKIE}=`));
  return match ? decodeURIComponent(match.slice(SHEET_PREFERENCE_COOKIE.length + 1)) : undefined;
}
