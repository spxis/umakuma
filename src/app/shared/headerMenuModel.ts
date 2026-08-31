import {
  ADMIN_WORKSPACE_TABS,
  ADMIN_WORKSPACE_TAB_LABELS,
  routeForAdminWorkspaceTab,
} from "../admin/AdminWorkspaceTabs";
import { MENU_NAV_SECTIONS, TOP_NAV_SECTIONS, navChildHref } from "./navSections";

/**
 * Every admin page, from the registry the admin header already reads.
 *
 * The menu used to carry two hand-written links, "Admin" and "Manage users",
 * while admin had nine pages - so seven of them existed only if you already
 * knew the header was there. Reading the registry means adding an admin page
 * puts it in the menu, which is what a second list is for failing to do.
 */
function adminLinks(): MenuLink[] {
  return ADMIN_WORKSPACE_TABS.map((tab) => ({
    label: ADMIN_WORKSPACE_TAB_LABELS[tab],
    href: routeForAdminWorkspaceTab(tab),
  }));
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
}): HeaderMenuModel {
  const { username, isAdmin, showAdminActions } = input;

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
    settings: MENU_NAV_SECTIONS.flatMap((section) =>
      section.children.map((child) => ({
        label: child.label,
        href: navChildHref(child, username),
      })),
    ),
    site: SITE_LINKS,
    admin,
    navigate: TOP_NAV_SECTIONS.map((section) => ({
      label: section.label,
      links: section.children.map((child) => ({
        label: child.label,
        href: navChildHref(child, username),
      })),
    })),
  };
}
