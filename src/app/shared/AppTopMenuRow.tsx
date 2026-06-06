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

function isPlainLeftClick(event: ReactMouseEvent<HTMLAnchorElement>): boolean {
  return !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

function userTabHref(username: string | null, tab: "learn" | "wk" | "jlpt" | "stats" | "news" | "read"): string {
  if (!username) {
    return "/join";
  }

  return `/users/${encodeURIComponent(username)}/${tab}`;
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
    { label: "Stats", href: userTabHref(resolvedWkUsername, "stats"), dashboard: "stats" },
    { label: "News", href: userTabHref(resolvedWkUsername, "news"), dashboard: "news" },
    { label: "Read", href: userTabHref(resolvedWkUsername, "read"), dashboard: "read" },
  ];
  const userBasePath = resolvedWkUsername ? `/users/${encodeURIComponent(resolvedWkUsername)}` : null;
  const isOnResolvedUserDashboard = Boolean(
    pathname && userBasePath && (pathname === userBasePath || pathname.startsWith(`${userBasePath}/`)),
  );

  return (
    <section className={`flex items-center justify-between gap-3 ${className ?? ""}`}>
      <nav className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/50 sm:text-[11px]">
        {links.map((link) => (
          <Link
            key={`${link.label}-${link.href}`}
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
