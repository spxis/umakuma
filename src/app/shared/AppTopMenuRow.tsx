"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent as ReactMouseEvent } from "react";

import { buildMainLinks, type MainLink } from "./appTopMenuLinks";
import { TOP_NAV_SECTIONS, navChildHref, sectionForPath, sectionHasSubNav } from "./navSections";
import AppSubNavRow from "./AppSubNavRow";
import GlobalSearchBox from "./GlobalSearchBox";
import UserHeaderMenu from "../users/[nickname]/UserHeaderMenu";
import type { TabId, ViewerMenuInfo } from "../users/[nickname]/UserDashboardTabs.types";
import { viewerAddress } from "@/app/shared/viewerAddress";

type AppTopMenuRowProps = {
  viewerMenuInfo: ViewerMenuInfo | null;
  primaryWkUsername?: string | null;
  accountId?: string;
  showAdminActions?: boolean;
  lastSyncedAt?: string | null;
  lastActivityAt?: string | null;
  className?: string;
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
}: AppTopMenuRowProps) {
  const pathname = usePathname();
  const resolvedWkUsername = primaryWkUsername ?? viewerAddress(viewerMenuInfo);
  const canSeeAdminTopLink = showAdminActions;
  const flatLinks: MainLink[] = buildMainLinks(resolvedWkUsername, canSeeAdminTopLink);
  const activeSection = sectionForPath(pathname, resolvedWkUsername);
  const links: MainLink[] = resolvedWkUsername
    ? [
        ...TOP_NAV_SECTIONS.map((section) => ({
          label: section.label,
          href: navChildHref(section.children[0]!, resolvedWkUsername),
          dashboard: null,
        })),
        ...(canSeeAdminTopLink ? [{ label: "Admin", href: "/admin", dashboard: null as null }] : []),
      ]
    : flatLinks;
  const mobileLinks = links.filter((link) =>
    link.label === "Leaderboard" || link.label === "Study" || link.label === "Game" || link.label === "Admin"
  );

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

    if (activeSection && link.label === activeSection.label) {
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
      <nav className="flex min-w-0 items-center gap-x-1.5 overflow-hidden whitespace-nowrap text-[9px] font-semibold uppercase tracking-widest text-foreground/50 sm:hidden">
        {mobileLinks.map((link, index) => (
          <span key={`mobile-${link.label}-${link.href}`} className="inline-flex items-center gap-x-1.5">
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
      <nav className="hidden flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/50 sm:flex">
        {links.map((link, index) => (
          <span key={`${link.label}-${link.href}`} className="inline-flex items-center gap-x-3">
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
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <GlobalSearchBox />
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
        section={sectionHasSubNav(activeSection) ? activeSection : null}
        pathname={pathname}
        wkUsername={resolvedWkUsername}
      />
    </div>
  );
}
