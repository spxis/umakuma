import type { MemberAccess } from "@/lib/memberCapabilities";

import { MENU_NAV_SECTIONS, TOP_NAV_SECTIONS, navChildHref, visibleNavSections } from "./navSections";

/**
 * The one way into admin, for an admin.
 *
 * The menu listed every admin page - eleven entries - which is a second copy
 * of the admin workspace's own tab row, in a menu whose job is the account.
 * One entry, to the workspace; the tab row there is the page registry, and it
 * is one click further.
 */
const ADMIN_LINK = { label: "Admin", href: "/admin" };

function adminLinks(): MenuLink[] {
  return [ADMIN_LINK];
}

export type MenuLink = { label: string; href: string };
export type MenuNavSection = { label: string; links: MenuLink[] };

/**
 * Pages that belong to the site rather than to a member.
 *
 * Updates was only reachable from the version number in the footer, which
 * nobody finds. It is public, so it is offered to signed-out visitors too.
 */
export const SITE_LINKS: MenuLink[] = [{ label: "Updates", href: "/releases" }];

export type HeaderMenuModel = {
  /** Your own pages: where you are, rather than where you can go. */
  account: MenuLink[];
  /** Account configuration, formerly a header tab of its own. */
  settings: MenuLink[];
  /** Public pages, offered whether or not the viewer has an account. */
  site: MenuLink[];
  admin: MenuLink[];
  /**
   * The header's own sections, repeated for small screens only.
   *
   * The header shows every section on a desktop, so listing them again in the
   * menu was pure duplication - and because the menu kept its own flat list
   * rather than reading this one, the copy had drifted: Practice and Profile
   * existed in the header and were missing from the menu entirely.
   */
  navigate: MenuNavSection[];
};

export function buildHeaderMenu(input: {
  username: string | null;
  isAdmin: boolean;
  showAdminActions: boolean;
  /** What this member can reach. Defaults to a connected account. */
  access?: MemberAccess;
}): HeaderMenuModel {
  const { username, isAdmin, showAdminActions } = input;
  const access = input.access ?? { hasWanikani: true };

  if (!username) {
    // No account: nothing here is reachable, so offer nothing but admin.
    return {
      account: [],
      settings: [],
      site: SITE_LINKS,
      admin: isAdmin || showAdminActions ? adminLinks() : [],
      navigate: [],
    };
  }

  const base = `/users/${encodeURIComponent(username)}`;

  const admin: MenuLink[] = isAdmin || showAdminActions ? adminLinks() : [];

  return {
    account: [{ label: "My page", href: base }],
    settings: visibleNavSections(MENU_NAV_SECTIONS, access).flatMap((section) =>
      section.children.map((child) => ({
        label: child.label,
        href: navChildHref(child, username),
      })),
    ),
    site: SITE_LINKS,
    admin,
    navigate: visibleNavSections(TOP_NAV_SECTIONS, access).map((section) => ({
      label: section.label,
      links: section.children.map((child) => ({
        label: child.label,
        href: navChildHref(child, username),
      })),
    })),
  };
}
