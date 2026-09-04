import {
  MEMBER_CAPABILITIES,
  canUseCapability,
  type MemberAccess,
  type MemberCapabilityId,
} from "@/lib/memberCapabilities";

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
export type NavSectionId = "study" | "game" | "explore" | "lists" | "read" | "settings";

export type NavChild = {
  label: string;
  /** Path after `/users/<name>`, or an absolute path when not user-scoped. */
  path: string;
  /** Where it goes for somebody with no page of their own. */
  fallback?: string;
  /**
   * The capability this page needs, when it needs one.
   *
   * Set it and the entry disappears for a member who cannot use the page,
   * rather than leading them to an empty one. Left unset, the page is open to
   * every member, which is true of most of them.
   */
  requires?: MemberCapabilityId;
  /**
   * A page that only exists inside somebody's own account.
   *
   * Without a user segment there is no address to send a visitor to, and the
   * generic fallback would point them at the home page under a name that
   * promised something else. Dropped from the row instead.
   */
  memberOnly?: boolean;
};

export type NavSection = {
  id: NavSectionId;
  label: string;
  /** What the group is called when its internal-only pages are not offered. */
  publicLabel?: string;
  children: NavChild[];
  /**
   * Where the section belongs.
   *
   * `nav` sections are destinations you visit while studying, and they sit in
   * the header. `menu` sections are about your account rather than places to
   * go, so they live in the account menu - which already holds the
   * preferences, and having both meant two homes for one idea.
   */
  placement: "nav" | "menu";
};

/**
 * Groups in header order. A section with one child links straight to it and
 * shows no second row; the sub-nav would just repeat the header.
 */
export const NAV_SECTIONS: NavSection[] = [
  /*
   * Reviews, and the two records of them. History and Stats had a group of
   * their own called Progress, which named the same thing from a distance:
   * both pages are the account's WaniKani progress, and the studying that
   * produced them is one click away in a different group. They sit under the
   * reviews now, and Progress is gone rather than kept as an empty shell.
   */
  {
    id: "study",
    label: "Study",
    placement: "nav",
    children: [
      { label: "Reviews", path: "study" },
      { label: "History", path: "study/history" },
      { label: DASHBOARD_TAB_LABELS.stats, path: "study/stats", requires: MEMBER_CAPABILITIES.wanikaniProgress },
    ],
  },
  { id: "game", label: "Game", placement: "nav", children: [{ label: "Game", path: "game" }] },
  {
    id: "explore",
    label: "Learn",
    placement: "nav",
    children: [
      { label: DASHBOARD_TAB_LABELS.wk, path: "library-explorer", requires: MEMBER_CAPABILITIES.wanikaniLibrary },
      { label: DASHBOARD_TAB_LABELS.jlpt, path: "jlpt-explorer" },
      { label: "Grades", path: "grades" },
      { label: "Practice", path: "practice" },
      /* Public, so it has no user segment: a map is the same for everyone. */
      { label: "Maps", path: "/maps" },
      { label: "Strokes", path: "/strokes" },
      /* The parts, beside the counts: both are facts about the writing. */
      { label: "Radicals", path: "/radicals" },
    ],
  },
  /*
   * A destination of its own. Lists lived under Explore, which is where you
   * go to find things; a list is something you made and come back to, and it
   * was two clicks from everywhere.
   */
  /*
   * Every list lives here: the member's own, the ones they follow and the
   * auto lists. A visitor with no page of their own lands on the auto lists,
   * which are the part of Lists that belongs to everybody.
   */
  {
    id: "lists",
    label: "Lists",
    placement: "nav",
    /*
     * Four collections that used to be stacked down one page. The names are
     * the page's own headings - "Your lists", "Auto lists", "Following",
     * "Archived" - so the row and the page agree rather than inventing a
     * second vocabulary for the same things.
     *
     * Only the first is public: a visitor with no page of their own lands on
     * the auto lists, which are the part of Lists that belongs to everybody.
     * What a member follows, and has put away, is theirs alone.
     */
    children: [
      { label: "Your lists", path: "lists", fallback: "/lists" },
      { label: "Auto lists", path: "lists/auto", memberOnly: true },
      { label: "Following", path: "lists/following", memberOnly: true },
      { label: "Archived", path: "lists/archived", memberOnly: true },
    ],
  },
  {
    /*
     * The reading challenge is one family's arrangement about pocket money,
     * not a feature of a Japanese study site, so it is offered to them and to
     * nobody else. The news reader is for everybody, and it is what the group
     * is called for a member who is not one of us.
     */
    id: "read",
    label: "Read",
    publicLabel: "News",
    placement: "nav",
    children: [
      { label: DASHBOARD_TAB_LABELS.read, path: "read", requires: MEMBER_CAPABILITIES.readingChallenge },
      { label: DASHBOARD_TAB_LABELS.news, path: "news" },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    placement: "menu",
    children: [
      { label: "Profile", path: "profile" },
      /*
       * The connection is settings, not a place to study. It stays listed
       * whether or not one exists: without it this is the only door, and with
       * it, it is where a dead token gets replaced.
       */
      { label: "WaniKani", path: "wanikani" },
      { label: "Libraries", path: "libraries" },
    ],
  },
];

/** The absolute href for a child, given the viewer's user segment. */
export function navChildHref(child: NavChild, username: string | null): string {
  if (child.path.startsWith("/")) {
    return child.path;
  }

  if (username) return `/users/${encodeURIComponent(username)}/${child.path}`;
  return child.fallback ?? "/";
}

/** Whether a pathname is that address or a page under it, and not merely spelled like it. */
function startsWithPath(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(`${path}/`);
}

/** The section a pathname belongs to, or null when it is outside the grouped nav. */
export function sectionForPath(pathname: string | null, username: string | null): NavSection | null {
  if (!pathname) {
    return null;
  }

  /* The root belongs to no group: the leaderboard is not in the header. */
  if (pathname === "/") return null;

  /*
   * A page outside the user segment still belongs to a group, by its own
   * absolute path or by the fallback a group offers a visitor.
   *
   * By prefix, not by equality. `/maps` found its group and `/maps/japan/gifu`
   * found nothing, so opening a prefecture took the whole second row off the
   * page - and the same for every stroke count under `/strokes`. A member page
   * never had the bug because it matches on its first segment, which is why
   * `/grades/1` keeps its row; this is that rule for the absolute entries.
   * The boundary matters: `/mapsomething` is not a page in Maps.
   */
  const absolute = NAV_SECTIONS.find((section) =>
    section.children.some(
      (child) =>
        (child.path.startsWith("/") && child.path !== "/" && startsWithPath(pathname, child.path)) ||
        (child.fallback !== undefined && startsWithPath(pathname, child.fallback)),
    ),
  );
  if (absolute) return absolute;

  const base = username ? `/users/${encodeURIComponent(username)}/` : null;
  const segment = base && pathname.startsWith(base) ? pathname.slice(base.length).split("/")[0] : null;
  if (!segment) {
    return null;
  }

  // `wk-explorer` is the old path for the WaniKani explorer; links in the wild
  // still point at it, so it resolves to the same section.
  const normalized = segment === "wk-explorer" ? "library-explorer" : segment;
  /* `/lists` with no member is the auto lists, which belong to the Lists group. */
  return (
    NAV_SECTIONS.find((section) =>
      // A child may be nested (`grades/practice`); its first segment is what a
      // pathname surfaces here.
      section.children.some((child) => child.path.split("/")[0] === normalized),
    ) ?? null
  );
}

/** The children worth drawing for this viewer: member-only pages need a member. */
export function navChildrenFor(section: NavSection | null, username: string | null): NavChild[] {
  return (section?.children ?? []).filter((child) => !child.memberOnly || username !== null);
}

/** Whether a section should show a second row: only when it holds more than one page. */
export function sectionHasSubNav(section: NavSection | null): boolean {
  return (section?.children.length ?? 0) > 1;
}

/**
/**
 * The same sections, with the pages this member cannot use taken out.
 *
 * A section whose children all go loses the section: Learn without the Library
 * Explorer still has JLPT, grades and the maps, but a group with nothing left
 * in it is a header entry that leads nowhere. A section that loses only some
 * of its children takes its public name - Read without the reading challenge
 * is simply News - so the header never promises a page it is not offering.
 * Path resolution is deliberately not filtered - `sectionForPath` still knows
 * where a gated address belongs, so a member who follows an old link gets a
 * coherent header rather than a page with no group at all.
 */
export function visibleNavSections(
  sections: readonly NavSection[],
  access: MemberAccess,
): NavSection[] {
  return sections
    .map((section) => {
      const children = section.children.filter(
        (child) => child.requires === undefined || canUseCapability(child.requires, access),
      );
      const dropped = children.length !== section.children.length;
      return { ...section, children, label: dropped ? section.publicLabel ?? section.label : section.label };
    })
    .filter((section) => section.children.length > 0);
}

/** Sections shown in the header. */
export const TOP_NAV_SECTIONS = NAV_SECTIONS.filter((section) => section.placement === "nav");


/** Sections that live in the account menu instead of the header. */
export const MENU_NAV_SECTIONS = NAV_SECTIONS.filter((section) => section.placement === "menu");
