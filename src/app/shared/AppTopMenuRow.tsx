"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";

import { buildMainLinks, type MainLink } from "./appTopMenuLinks";
import { SEARCH_PAGE_COPY } from "@/app/search/searchCopy";
import { SEARCH_PAGE_HREF } from "@/lib/globalSearch";
import { TOP_NAV_SECTIONS, navChildHref, sectionForPath, sectionHasSubNav, visibleNavSections } from "./navSections";
import AppSubNavRow from "./AppSubNavRow";
import GlobalSearchBox from "./GlobalSearchBox";
import UserHeaderMenu from "../users/[nickname]/UserHeaderMenu";
import type { TabId, ViewerMenuInfo } from "../users/[nickname]/UserDashboardTabs.types";
import { viewerAddress, viewsOwnPage } from "@/app/shared/viewerAddress";
import type { MemberAccess } from "@/lib/memberCapabilities";

type AppTopMenuRowProps = {
  viewerMenuInfo: ViewerMenuInfo | null;
  primaryWkUsername?: string | null;
  accountId?: string;
  showAdminActions?: boolean;
  lastSyncedAt?: string | null;
  lastActivityAt?: string | null;
  className?: string;
  /** Sub-navigation for a section that supplies its own, such as admin. */
  subNav?: ReactNode;
};

const DASHBOARD_ROUTE_SEGMENTS = new Set(["study", "learn", "wk", "wk-explorer", "library-explorer", "jlpt", "jlpt-explorer", "stats", "news", "read"]);

function isDashboardTabId(value: string | null): value is TabId {
  return value === "learn" || value === "wk" || value === "jlpt" || value === "stats" || value === "news" || value === "read";
}

function isPlainLeftClick(event: ReactMouseEvent<HTMLAnchorElement>): boolean {
  return !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

export default function AppTopMenuRow({
  viewerMenuInfo,
  primaryWkUsername = null,
  accountId,
  showAdminActions = false,
  lastSyncedAt = null,
  lastActivityAt = null,
  className,
  subNav,
}: AppTopMenuRowProps) {
  const pathname = usePathname();
  const [searchExpanded, setSearchExpanded] = useState(false);
  /*
   * The search page carries its own box, so the header's is a second field
   * asking the same question a hand's width above the first. It steps aside
   * and leaves a link where a member expects the section to be named.
   */
  const onSearchPage = pathname === SEARCH_PAGE_HREF;
  const resolvedWkUsername = primaryWkUsername ?? viewerAddress(viewerMenuInfo);
  const flatLinks: MainLink[] = buildMainLinks(resolvedWkUsername);
  const activeSection = sectionForPath(pathname, resolvedWkUsername);
  /*
   * Your own header answers for your own account. When the row is pointed at
   * somebody else's pages - which only happens for an admin, since that is who
   * else may open them - nothing is hidden: an admin looking at a member's
   * page is not the member, and a header that quietly dropped entries there
   * would be reporting the wrong account's state.
   */
  const isOwnNav = viewsOwnPage(viewerMenuInfo, resolvedWkUsername);
  const access: MemberAccess = {
    hasWanikani: isOwnNav ? Boolean(viewerMenuInfo?.hasWanikani) : true,
    /* The reading challenge is the family's; an admin settles it, so they are offered it too. */
    internal: isOwnNav ? viewerMenuInfo?.internal === true || viewerMenuInfo?.isAdmin === true : true,
  };
  const sections = visibleNavSections(TOP_NAV_SECTIONS, access);
  const visibleActiveSection = sections.find((section) => section.id === activeSection?.id) ?? null;
  const sectionLinks: MainLink[] = resolvedWkUsername
    ? [
        ...sections.map((section) => ({
          label: section.label,
          href: navChildHref(section.children[0]!, resolvedWkUsername),
          dashboard: null,
        })),
      ]
    : flatLinks;
  /* Named in the row only where the box has stepped aside for the page's own. */
  const links: MainLink[] = onSearchPage
    ? [...sectionLinks, { label: SEARCH_PAGE_COPY.heading, href: SEARCH_PAGE_HREF, dashboard: null }]
    : sectionLinks;
  /*
   * The phone gets every section, not four of them.
   *
   * This used to be an allowlist of four labels - Leaderboard, Study, Game,
   * Admin - so Explore, Progress and Read simply did not exist in a phone's
   * header, and the only way to any of them was to know the menu was there.
   * Seven labels cannot fit 393 pixels, so the row scrolls sideways instead,
   * the way the admin tab row already does, with the same fade at the edge to
   * say there is more. Dropping the allowlist also removes a list of literal
   * labels that would have quietly stopped matching if a section were renamed.
   */
  const mobileLinks = links;

  const userBasePath = resolvedWkUsername ? `/users/${encodeURIComponent(resolvedWkUsername)}` : null;
  const routeSegment =
    pathname && userBasePath && pathname.startsWith(`${userBasePath}/`)
      ? pathname.slice(userBasePath.length + 1).split("/")[0] ?? null
      : null;
  const normalizedDashboardPathSegment = routeSegment === "study"
    ? "learn"
    : routeSegment === "wk-explorer" || routeSegment === "library-explorer"
      ? "wk"
      : routeSegment === "jlpt-explorer"
        ? "jlpt"
        : routeSegment;
  const currentDashboardTab = isDashboardTabId(normalizedDashboardPathSegment)
    ? normalizedDashboardPathSegment
    : null;
  const isOnResolvedUserDashboard = Boolean(
    pathname &&
    userBasePath &&
    (pathname === userBasePath || (routeSegment && DASHBOARD_ROUTE_SEGMENTS.has(routeSegment))),
  );

  function linkIsActive(link: MainLink): boolean {
    if (!pathname) {
      return false;
    }

    if (link.dashboard && isOnResolvedUserDashboard) {
      return currentDashboardTab === link.dashboard;
    }

    /* The visible section, since a group can be drawn under its public name. */
    if (visibleActiveSection && link.label === visibleActiveSection.label) {
      return true;
    }

    if (link.href === "/") {
      return pathname === "/";
    }

    return pathname === link.href || pathname.startsWith(`${link.href}/`);
  }

  return (
    <div className={`relative ${className ?? ""}`.trim()}>
    <section className="flex items-center justify-between gap-3">
      {/*
        * The links give the box the row while it is open.
        *
        * Sharing the width made them wrap to a second line and squeezed the
        * field at the same time; a member who has started typing is not
        * reaching for Learn, and the links are one Escape away.
        */}
      <nav
        className={`admin-tab-scroll min-w-0 flex-1 items-center gap-x-1.5 overflow-x-auto whitespace-nowrap text-[10px] font-semibold uppercase tracking-widest text-foreground/60 lg:hidden ${
          searchExpanded ? "hidden" : "flex"
        }`}
      >
        {mobileLinks.map((link, index) => (
          <span key={`mobile-${link.label}-${link.href}`} className="inline-flex shrink-0 items-center gap-x-1.5">
            <Link
              href={link.href}
              className={`transition ${linkIsActive(link) ? "font-black text-foreground" : "hover:text-foreground/80"}`}
            >
              {link.label}
            </Link>
            {index < mobileLinks.length - 1 ? (
              <span aria-hidden="true" className="text-foreground/35">|</span>
            ) : null}
          </span>
        ))}
      </nav>
      <nav
        /*
         * One line, always. Wrapping put LEADERBOARD | STUDY on one row and
         * PROGRESS | READ on the next the moment the codename appeared beside
         * it at 1024px, and a header that changes height as you resize moves
         * the page under the reader. It scrolls instead, the way the phone row
         * beneath it already did.
         */
        className={`admin-tab-scroll hidden min-w-0 flex-1 flex-nowrap items-center gap-x-3 overflow-x-auto whitespace-nowrap text-xs font-semibold uppercase tracking-[0.14em] text-foreground/60 ${
          searchExpanded ? "" : "lg:flex"
        }`}
      >
        {links.map((link, index) => (
          <span key={`${link.label}-${link.href}`} className="inline-flex shrink-0 items-center gap-x-3">
            <Link
              href={link.href}
              onClick={(event) => {
                if (!link.dashboard || !isOnResolvedUserDashboard || !isPlainLeftClick(event)) {
                  return;
                }

                event.preventDefault();
                window.dispatchEvent(
                  new CustomEvent("wr:dashboard-tab-request", {
                    detail: { tab: link.dashboard },
                  }),
                );
              }}
              className={`transition ${linkIsActive(link) ? "font-black text-foreground" : "hover:text-foreground/80"}`}
            >
              {link.label}
            </Link>
            {index < links.length - 1 ? (
              <span aria-hidden="true" className="text-foreground/35">|</span>
            ) : null}
          </span>
        ))}
      </nav>

      {/*
        * Search and the menu, together, at the end of the row. The menu used to
        * float on its own past the codename; there is nothing for it to be
        * separate from now, and pairing them puts every control in one place.
        */}
      <div className={`ml-auto flex items-center gap-2 ${searchExpanded ? "min-w-0 flex-1" : "shrink-0"}`}>
        {onSearchPage ? null : (
          <GlobalSearchBox
            viewerAccountId={viewerMenuInfo?.accountId ?? null}
            onExpandedChange={setSearchExpanded}
          />
        )}
        <UserHeaderMenu
          accountId={accountId}
          viewedWkUsername={resolvedWkUsername ?? undefined}
          viewerMenuInfo={viewerMenuInfo}
          showAdminActions={showAdminActions}
          lastSyncedAt={lastSyncedAt}
          lastActivityAt={lastActivityAt}
        />
      </div>
    </section>

      <AppSubNavRow
        section={sectionHasSubNav(visibleActiveSection) ? visibleActiveSection : null}
        pathname={pathname}
        wkUsername={resolvedWkUsername}
        viewerMenuInfo={viewerMenuInfo}
        subNav={subNav}
      />
    </div>
  );
}
