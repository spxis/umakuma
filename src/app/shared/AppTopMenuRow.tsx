"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent as ReactMouseEvent } from "react";

import ReleaseMotto from "./ReleaseMotto";
import UserHeaderMenu from "../users/[nickname]/UserHeaderMenu";
import type { TabId, ViewerMenuInfo } from "../users/[nickname]/UserDashboardTabs.types";
import { DASHBOARD_TAB_LABELS } from "../users/[nickname]/userReadConfig";

type AppTopMenuRowProps = {
  viewerMenuInfo: ViewerMenuInfo | null;
  primaryWkUsername?: string | null;
  accountId?: string;
  showAdminActions?: boolean;
  lastSyncedAt?: string | null;
  lastActivityAt?: string | null;
  className?: string;
};

type MainLink = {
  label: string;
  href: string;
  dashboard: TabId | null;
};

const DASHBOARD_ROUTE_SEGMENTS = new Set(["study", "learn", "wk", "wk-explorer", "library-explorer", "jlpt", "jlpt-explorer", "stats", "news", "read"]);

function isDashboardTabId(value: string | null): value is TabId {
  return value === "learn" || value === "wk" || value === "jlpt" || value === "stats" || value === "news" || value === "read";
}

function isPlainLeftClick(event: ReactMouseEvent<HTMLAnchorElement>): boolean {
  return !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

function userTabHref(username: string | null, tab: "learn" | "wk" | "jlpt" | "stats" | "news" | "read"): string {
  if (!username) {
    return "/join";
  }

  const segment = tab === "learn" ? "study" : tab === "wk" ? "library-explorer" : tab === "jlpt" ? "jlpt-explorer" : tab;
  return `/users/${encodeURIComponent(username)}/${segment}`;
}

function userHistoryHref(username: string | null): string {
  if (!username) {
    return "/join";
  }

  return `/users/${encodeURIComponent(username)}/history`;
}

function userGameHref(username: string | null): string {
  if (!username) {
    return "/join";
  }

  return `/users/${encodeURIComponent(username)}/game`;
}

function userLibrariesHref(username: string | null): string {
  if (!username) {
    return "/join";
  }

  return `/users/${encodeURIComponent(username)}/libraries`;
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
  const resolvedWkUsername = primaryWkUsername ?? viewerMenuInfo?.wkUsername ?? null;
  const canSeeAdminTopLink = showAdminActions;
  const links: MainLink[] = [
    { label: "Leaderboard", href: "/", dashboard: null },
    { label: DASHBOARD_TAB_LABELS.learn, href: userTabHref(resolvedWkUsername, "learn"), dashboard: "learn" },
    { label: "Game", href: userGameHref(resolvedWkUsername), dashboard: null },
    { label: DASHBOARD_TAB_LABELS.wk, href: userTabHref(resolvedWkUsername, "wk"), dashboard: "wk" },
    { label: DASHBOARD_TAB_LABELS.jlpt, href: userTabHref(resolvedWkUsername, "jlpt"), dashboard: "jlpt" },
    { label: "History", href: userHistoryHref(resolvedWkUsername), dashboard: null },
    { label: DASHBOARD_TAB_LABELS.stats, href: userTabHref(resolvedWkUsername, "stats"), dashboard: "stats" },
    { label: DASHBOARD_TAB_LABELS.news, href: userTabHref(resolvedWkUsername, "news"), dashboard: "news" },
    { label: DASHBOARD_TAB_LABELS.read, href: userTabHref(resolvedWkUsername, "read"), dashboard: "read" },
    { label: "Libraries", href: userLibrariesHref(resolvedWkUsername), dashboard: null },
  ];
  if (canSeeAdminTopLink) {
    links.push({ label: "Admin", href: "/admin", dashboard: null });
  }
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

    if (link.href === "/") {
      return pathname === "/";
    }

    return pathname === link.href || pathname.startsWith(`${link.href}/`);
  }

  return (
    <section className={`flex items-center justify-between gap-3 ${className ?? ""}`}>
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

      <ReleaseMotto />

      <div className="shrink-0">
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
  );
}
