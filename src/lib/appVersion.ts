/**
 * The site version shown in the footer.
 *
 * Every feature release bumps the minor: the new timeline entry in
 * `src/data/featureTimeline.json` gets the next `0.N.0`, and this constant
 * and `package.json` move with it. The timeline test enforces all three
 * agree, so a forgotten bump fails `quality:check` rather than shipping a
 * stale number.
 */
export const APP_VERSION = "0.56.0";
