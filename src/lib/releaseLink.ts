/**
 * The public updates page, listing every shipped release.
 *
 * There used to be a `releasesHrefForViewer(isAdmin)` beside this, from when
 * the only release list was the admin timeline and pointing a member at it
 * would have bounced them off an authorization wall. The updates page went
 * public and the function kept its parameter without ever reading it again -
 * which quietly cost a `getServerSession` call in the root layout, on every
 * page render, to compute a flag that could not change the answer.
 */
export const RELEASES_HREF = "/releases";
