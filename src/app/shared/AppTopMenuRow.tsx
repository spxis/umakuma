import Link from "next/link";

import UserHeaderMenu from "../users/[nickname]/UserHeaderMenu";
import type { ViewerMenuInfo } from "../users/[nickname]/UserDashboardTabs.types";

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
};

function userTabHref(username: string | null, tab: "learn" | "stats" | "news" | "read"): string {
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
  const resolvedWkUsername = primaryWkUsername ?? viewerMenuInfo?.wkUsername ?? null;
  const links: MainLink[] = [
    { label: "Leaderboard", href: "/" },
    { label: "Study", href: userTabHref(resolvedWkUsername, "learn") },
    { label: "Stats", href: userTabHref(resolvedWkUsername, "stats") },
    { label: "News", href: userTabHref(resolvedWkUsername, "news") },
    { label: "Read", href: userTabHref(resolvedWkUsername, "read") },
  ];

  return (
    <section className={`flex items-center justify-between gap-3 ${className ?? ""}`}>
      <nav className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/50 sm:text-[11px]">
        {links.map((link) => (
          <Link
            key={`${link.label}-${link.href}`}
            href={link.href}
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
