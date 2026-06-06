"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent as ReactMouseEvent } from "react";

import UserHeaderMenu from "../users/[nickname]/UserHeaderMenu";
import type { TabId, ViewerMenuInfo } from "../users/[nickname]/UserDashboardTabs.types";

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

const DASHBOARD_ROUTE_SEGMENTS = new Set(["study", "learn", "wk", "jlpt", "stats", "news", "read"]);

function isPlainLeftClick(event: ReactMouseEvent<HTMLAnchorElement>): boolean {
  return !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

function userTabHref(username: string | null, tab: "learn" | "wk" | "jlpt" | "stats" | "news" | "read"): string {
  if (!username) {
    return "/join";
  }

  const segment = tab === "learn" ? "study" : tab;
  return `/users/${encodeURIComponent(username)}/${segment}`;
}

function userHistoryHref(username: string | null): string {
  if (!username) {
    return "/join";
  }

  return `/users/${encodeURIComponent(username)}/history`;
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
  const links: MainLink[] = [
    { label: "Leaderboard", href: "/", dashboard: null },
    { label: "Study", href: userTabHref(resolvedWkUsername, "learn"), dashboard: "learn" },
    { label: "WK Explorer", href: userTabHref(resolvedWkUsername, "wk"), dashboard: "wk" },
    { label: "JLPT Explorer", href: userTabHref(resolvedWkUsername, "jlpt"), dashboard: "jlpt" },
    { label: "History", href: userHistoryHref(resolvedWkUsername), dashboard: null },
    { label: "Stats", href: userTabHref(resolvedWkUsername, "stats"), dashboard: "stats" },
    { label: "News", href: userTabHref(resolvedWkUsername, "news"), dashboard: "news" },
    { label: "Read", href: userTabHref(resolvedWkUsername, "read"), dashboard: "read" },
  ];
  const dividerAfterLabels = new Set(["Leaderboard", "JLPT Explorer", "Read"]);
  const userBasePath = resolvedWkUsername ? `/users/${encodeURIComponent(resolvedWkUsername)}` : null;
  const routeSegment =
    pathname && userBasePath && pathname.startsWith(`${userBasePath}/`)
      ? pathname.slice(userBasePath.length + 1).split("/")[0] ?? null
      : null;
  const isOnResolvedUserDashboard = Boolean(
    pathname &&
    userBasePath &&
    (pathname === userBasePath || (routeSegment && DASHBOARD_ROUTE_SEGMENTS.has(routeSegment))),
  );

  return (
    <section className={`flex items-center justify-between gap-3 ${className ?? ""}`}>
      <nav className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/50 sm:text-[11px]">
        {links.map((link) => (
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
              className="transition hover:text-foreground/80"
            >
              {link.label}
            </Link>
            {dividerAfterLabels.has(link.label) ? (
              <span aria-hidden="true" className="text-foreground/35">|</span>
            ) : null}
          </span>
        ))}
      </nav>

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
