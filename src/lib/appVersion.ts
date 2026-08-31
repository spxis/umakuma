/**
 * The site version and its release date, shown in the footer.
 *
 * Every feature release bumps the minor: the new timeline entry in
 * `src/data/featureTimeline.json` gets the next `0.N.0`, and this constant,
 * its date and `package.json` move with it. The timeline test enforces that
 * all of them agree, so a forgotten bump fails `quality:check` rather than
 * shipping a stale number.
 */
export const APP_VERSION = "0.126.0";

/** The calendar day APP_VERSION shipped, `YYYY-MM-DD`. */
export const APP_VERSION_DATE = "2026-08-30";
