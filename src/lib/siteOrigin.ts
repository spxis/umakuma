/**
 * Where the site is served from, canonically.
 *
 * Needed the moment a page names another page as the one of record: a
 * canonical link is resolved against this, and without it Next emits the path
 * on its own. Relative canonicals are legal and mostly understood, but the
 * whole point of the tag is to be unambiguous.
 *
 * A constant rather than `VERCEL_URL`, which names the deployment rather than
 * the site - `umakuma-3f9a2c.vercel.app` - so reading it would have every
 * preview build tell search engines that a throwaway host is the real one. The
 * apex redirects here, so this is the single address the site answers on.
 */
export const SITE_ORIGIN = "https://www.umakuma.com";

/** The same, as the URL that `metadataBase` wants. */
export const SITE_URL = new URL(SITE_ORIGIN);
