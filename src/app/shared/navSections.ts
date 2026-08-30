import { DASHBOARD_TAB_LABELS } from "../users/[nickname]/userReadConfig";

/**
 * The header, grouped.
 *
 * Ten flat items wrapped onto two rows at 1440px and read as a wall. They fall
 * into four natural pairs or triples, so the header names the group and the
 * group's own pages sit in a second row under it, shown only while you are in
 * that group.
 *
 * Grouping rather than hiding: everything reachable before is still one click
 * away, and the second row tells you where you are.
 */
export type NavSectionId = "leaderboard" | "study" | "game" | "explore" | "progress" | "read" | "settings";

export type NavChild = {
  label: string;
  /** Path after `/users/<name>`, or an absolute path when not user-scoped. */
  path: string;
};

export type NavSection = {
  id: NavSectionId;
  label: string;
  children: NavChild[];
};

/**
 * Groups in header order. A section with one child links straight to it and
 * shows no second row; the sub-nav would just repeat the header.
 */
export const NAV_SECTIONS: NavSection[] = [
  { id: "leaderboard", label: "Leaderboard", children: [{ label: "Leaderboard", path: "/" }] },
  { id: "study", label: "Study", children: [{ label: "Study", path: "study" }] },
  { id: "game", label: "Game", children: [{ label: "Game", path: "game" }] },
  {
    id: "explore",
    label: "Explore",
    children: [
      { label: DASHBOARD_TAB_LABELS.wk, path: "library-explorer" },
      { label: DASHBOARD_TAB_LABELS.jlpt, path: "jlpt-explorer" },
      { label: "Grades", path: "grades" },
      { label: "Practice", path: "grades/practice" },
    ],
  },
  {
    id: "progress",
    label: "Progress",
    children: [
      { label: "History", path: "history" },
      { label: DASHBOARD_TAB_LABELS.stats, path: "stats" },
    ],
  },
  {
    id: "read",
    label: "Read",
    children: [
      { label: DASHBOARD_TAB_LABELS.read, path: "read" },
      { label: DASHBOARD_TAB_LABELS.news, path: "news" },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    children: [{ label: "Libraries", path: "libraries" }],
  },
];

/** The absolute href for a child, given the viewer's user segment. */
export function navChildHref(child: NavChild, username: string | null): string {
  if (child.path.startsWith("/")) {
    return child.path;
  }

  return username ? `/users/${encodeURIComponent(username)}/${child.path}` : "/";
}

/** The section a pathname belongs to, or null when it is outside the grouped nav. */
export function sectionForPath(pathname: string | null, username: string | null): NavSection | null {
  if (!pathname) {
    return null;
  }

  if (pathname === "/") {
    return NAV_SECTIONS.find((section) => section.id === "leaderboard") ?? null;
  }

  const base = username ? `/users/${encodeURIComponent(username)}/` : null;
  const segment = base && pathname.startsWith(base) ? pathname.slice(base.length).split("/")[0] : null;
  if (!segment) {
    return null;
  }

  // `wk-explorer` is the old path for the WaniKani explorer; links in the wild
  // still point at it, so it resolves to the same section.
  const normalized = segment === "wk-explorer" ? "library-explorer" : segment;
  return (
    NAV_SECTIONS.find((section) =>
      // A child may be nested (`grades/practice`); its first segment is what a
      // pathname surfaces here.
      section.children.some((child) => child.path.split("/")[0] === normalized),
    ) ?? null
  );
}

/** Whether a section should show a second row: only when it holds more than one page. */
export function sectionHasSubNav(section: NavSection | null): boolean {
  return (section?.children.length ?? 0) > 1;
}
