import type { ViewerMenuInfo } from "@/app/users/[nickname]/UserDashboardTabs.types";

/**
 * Where a viewer's own pages live, or null when they have no address yet.
 *
 * Prefers the slug because it is permanent and every account has one, and
 * falls back to the WaniKani username for links shared before slugs existed.
 *
 * Several redirects used to read `wkUsername` directly and send anyone without
 * one to /join. That is every member who signed in with Google and never
 * connected WaniKani - which is now a supported way to use the site, not an
 * incomplete signup.
 */
export function viewerAddress(viewer: ViewerMenuInfo | null | undefined): string | null {
  return viewer?.slug?.trim() || viewer?.wkUsername?.trim() || null;
}


/**
 * Whether the viewer is looking at their own pages.
 *
 * Compared on the address rather than the account id, because that is what a
 * user page is keyed by, and against both of a viewer's addresses: a member who
 * arrives on a link carrying their old WaniKani username is still themselves.
 * Case-insensitive, since both forms appear in links people have shared.
 *
 * Saving belongs behind this. Reading a page is open to whoever may view it,
 * but a chosen set is saved to somebody's account, and the wrong answer here
 * offers a visitor a button that writes to the page owner's lists.
 */
export function viewsOwnPage(
  viewer: ViewerMenuInfo | null | undefined,
  pageKey: string | null | undefined,
): boolean {
  const key = pageKey?.trim().toLowerCase();
  if (!key || !viewer) return false;

  return [viewer.slug, viewer.wkUsername]
    .map((value) => value?.trim().toLowerCase())
    .some((value) => Boolean(value) && value === key);
}
