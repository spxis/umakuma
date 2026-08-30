import type { TabId } from "../users/[nickname]/UserDashboardTabs.types";
import { DASHBOARD_TAB_LABELS } from "../users/[nickname]/userReadConfig";

export type MainLink = {
  label: string;
  href: string;
  dashboard: TabId | null;
};

function userTabHref(username: string, tab: "learn" | "wk" | "jlpt" | "stats" | "news" | "read"): string {
  const segment = tab === "learn" ? "study" : tab === "wk" ? "library-explorer" : tab === "jlpt" ? "jlpt-explorer" : tab;
  return `/users/${encodeURIComponent(username)}/${segment}`;
}

/**
 * The main navigation, built for what the viewer can actually open.
 *
 * A viewer with no resolved account used to see every member link anyway, each
 * quietly pointing at /join — an admin with a stale link was told to "join
 * with invite code" by their own header. No account, no member links: the
 * leaderboard is public, and Admin appears only for admins.
 */
export function buildMainLinks(resolvedWkUsername: string | null, showAdminLink: boolean): MainLink[] {
  const links: MainLink[] = [{ label: "Leaderboard", href: "/", dashboard: null }];

  if (resolvedWkUsername) {
    const username = resolvedWkUsername;
    links.push(
      { label: DASHBOARD_TAB_LABELS.learn, href: userTabHref(username, "learn"), dashboard: "learn" },
      { label: "Game", href: `/users/${encodeURIComponent(username)}/game`, dashboard: null },
      { label: DASHBOARD_TAB_LABELS.wk, href: userTabHref(username, "wk"), dashboard: "wk" },
      { label: DASHBOARD_TAB_LABELS.jlpt, href: userTabHref(username, "jlpt"), dashboard: "jlpt" },
      { label: "Grades", href: `/users/${encodeURIComponent(username)}/grades`, dashboard: null },
      { label: "History", href: `/users/${encodeURIComponent(username)}/history`, dashboard: null },
      { label: DASHBOARD_TAB_LABELS.stats, href: userTabHref(username, "stats"), dashboard: "stats" },
      { label: DASHBOARD_TAB_LABELS.news, href: userTabHref(username, "news"), dashboard: "news" },
      { label: DASHBOARD_TAB_LABELS.read, href: userTabHref(username, "read"), dashboard: "read" },
      { label: "Libraries", href: `/users/${encodeURIComponent(username)}/libraries`, dashboard: null },
    );
  }

  if (showAdminLink) {
    links.push({ label: "Admin", href: "/admin", dashboard: null });
  }

  return links;
}
