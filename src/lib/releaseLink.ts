/** The admin page that lists every release and its date. */
export const RELEASES_HREF = "/admin/releases";

/**
 * Where the version number should link for this viewer, or `null` when it
 * should stay plain text.
 *
 * The release timeline is admin-only, so only an admin gets a link. Showing it
 * to everyone would hand members a link that bounces them off an authorization
 * wall, which is the same complaint as a header full of links to /join.
 */
export function releasesHrefForViewer(isAdmin: boolean): string | null {
  return isAdmin ? RELEASES_HREF : null;
}
