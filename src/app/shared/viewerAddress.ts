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
