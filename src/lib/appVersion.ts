/**
 * The site version, which release it is, and the day it shipped.
 *
 * Three numbers with their ordinary meanings: the major moves on a big release
 * - `1` is production, the point one review interface served both feeds - the
 * minor on a new feature, and the patch on a tweak to what came before.
 *
 * `APP_VERSION_RELEASE` is the count, which the version no longer carries. The
 * codename list is positional, so the footer needs to know this is the 480th
 * release to say what it is called. The timeline test enforces that all four
 * agree with `package.json` and the record, so a forgotten bump fails
 * `quality:check` rather than shipping a stale number.
 */
export const APP_VERSION = "1.40.0";

/** Which release this is, counting from the first. */
export const APP_VERSION_RELEASE = 527;

/** The calendar day APP_VERSION shipped, `YYYY-MM-DD`. */
export const APP_VERSION_DATE = "2026-09-06";
