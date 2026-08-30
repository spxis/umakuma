/** The public updates page, listing every shipped release. */
export const RELEASES_HREF = "/releases";

/**
 * Where the version number links.
 *
 * It used to be admin-only, because the only release list was the admin
 * timeline and pointing a member at it would have bounced them off an
 * authorization wall. The updates page is public, so everyone gets the link;
 * the admin timeline still holds the planned and shelved work.
 */
export function releasesHrefForViewer(_isAdmin: boolean): string {
  return RELEASES_HREF;
}
