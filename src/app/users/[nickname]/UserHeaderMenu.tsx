"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";
import { formatRelativeFromNow } from "@/lib/timeFormat";

import UserAdminRefreshButton from "./UserAdminRefreshButton";
import type { ViewerMenuInfo } from "./UserDashboardTabs.types";

type UserHeaderMenuProps = {
  accountId?: string;
  viewedWkUsername?: string;
  viewerMenuInfo: ViewerMenuInfo | null;
  showAdminActions?: boolean;
  hidden?: boolean;
  lastSyncedAt?: string | null;
  lastActivityAt?: string | null;
};

const MENU_BUTTON_CLASS =
  "inline-flex h-8 w-full items-center justify-center rounded-full border border-line bg-surface-muted px-2.5 text-[11px] font-bold uppercase tracking-[0.1em] text-foreground transition hover:bg-surface";
const MENU_LIST_GROUP_CLASS = "mt-2 overflow-hidden rounded-xl border border-line bg-surface";
const MENU_LIST_ITEM_CLASS = "flex h-10 w-full items-center px-3 text-sm font-semibold text-foreground transition hover:bg-surface-muted";
const MENU_LIST_ITEM_DIVIDER_CLASS = "border-t border-line";
const MENU_LIST_ITEM_ACTIVE_CLASS = "bg-surface-muted text-accent";

function getInitials(name: string | null): string {
  if (!name) {
    return "??";
  }

  const trimmed = name.trim();
  if (!trimmed) {
    return "??";
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

function isDashboardMenuTab(value: string | null): value is "learn" | "stats" | "news" | "read" {
  return value === "learn" || value === "wk" || value === "jlpt" || value === "stats" || value === "news" || value === "read";
}

function isPlainLeftClick(event: ReactMouseEvent<HTMLAnchorElement>): boolean {
  return !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

export default function UserHeaderMenu({
  accountId,
  viewedWkUsername,
  viewerMenuInfo,
  showAdminActions = false,
  hidden = false,
  lastSyncedAt = null,
  lastActivityAt = null,
}: UserHeaderMenuProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [refreshingLeaderboard, setRefreshingLeaderboard] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [themeMode, setThemeMode] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") {
      return "light";
    }

    try {
      return window.localStorage.getItem("wr:theme") === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  });
  const [jpFontMode, setJpFontMode] = useState<"sans" | "serif">(() => {
    if (typeof window === "undefined") {
      return "sans";
    }

    try {
      return window.localStorage.getItem("wr:jp-font") === "serif" ? "serif" : "sans";
    } catch {
      return "sans";
    }
  });
  const menuRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current && !panelRef.current) {
        return;
      }

      const target = event.target as Node;
      const clickedTrigger = Boolean(menuRef.current?.contains(target));
      const clickedPanel = Boolean(panelRef.current?.contains(target));

      if (!clickedTrigger && !clickedPanel) {
        setOpen(false);
      }
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onEscape);

    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onEscape);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 30_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  function toggleTheme() {
    const next = themeMode === "light" ? "dark" : "light";
    setThemeMode(next);
    try {
      window.localStorage.setItem("wr:theme", next);
    } catch {
      // Ignore storage errors in restricted browsing modes.
    }
    document.documentElement.setAttribute("data-theme", next);
  }

  function toggleJpFont() {
    const next = jpFontMode === "sans" ? "serif" : "sans";
    setJpFontMode(next);
    try {
      window.localStorage.setItem("wr:jp-font", next);
    } catch {
      // Ignore storage errors in restricted browsing modes.
    }
    document.documentElement.setAttribute("data-jp-font", next);
  }

  const hasSyncStatus = Boolean(lastSyncedAt);
  const hasActivityStatus = Boolean(lastActivityAt);
  const updatedRelativeLabel = hasSyncStatus
    ? formatRelativeFromNow(new Date(lastSyncedAt as string).getTime(), {
      nowMs,
      style: "long",
      allowFuture: false,
      noValueLabel: "unknown",
      invalidLabel: "unknown",
      justNowLabel: "just now",
    })
    : null;
  const activeRelativeLabel = hasActivityStatus
    ? formatRelativeFromNow(new Date(lastActivityAt as string).getTime(), {
      nowMs,
      style: "long",
      allowFuture: false,
      noValueLabel: "unknown",
      invalidLabel: "unknown",
      justNowLabel: "just now",
    })
    : "Unknown";

  if (hidden) {
    return null;
  }

  const resolvedUserPageUsername = viewerMenuInfo?.wkUsername ?? viewedWkUsername ?? null;
  const encodedResolvedUserPageUsername = resolvedUserPageUsername
    ? encodeURIComponent(resolvedUserPageUsername)
    : null;
  const userBasePath = encodedResolvedUserPageUsername ? `/users/${encodedResolvedUserPageUsername}` : null;
  const dashboardPathSegment = userBasePath && pathname?.startsWith(`${userBasePath}/`)
    ? pathname.slice(userBasePath.length + 1).split("/")[0] ?? null
    : null;
  const normalizedDashboardPathSegment = dashboardPathSegment === "study" ? "learn" : dashboardPathSegment;
  const currentDashboardTab = normalizedDashboardPathSegment
    ? normalizedDashboardPathSegment
    : isDashboardMenuTab(searchParams?.get("dashboard") ?? null)
      ? (searchParams?.get("dashboard") as "learn" | "stats" | "news" | "read")
      : "learn";
  const isOnResolvedUserDashboard = Boolean(
    userBasePath && pathname && (pathname === userBasePath || pathname.startsWith(`${userBasePath}/`)),
  );
  const adminSignedIn = Boolean(viewerMenuInfo?.provider === "google" && viewerMenuInfo.isAdmin);
  const dashboardPageLinks = resolvedUserPageUsername
    ? [
        { label: "Study", dashboard: "learn", href: `/users/${encodeURIComponent(resolvedUserPageUsername)}/study` },
        { label: "WK Explorer", dashboard: "wk", href: `/users/${encodeURIComponent(resolvedUserPageUsername)}/wk` },
        { label: "JLPT Explorer", dashboard: "jlpt", href: `/users/${encodeURIComponent(resolvedUserPageUsername)}/jlpt` },
        { label: "History", dashboard: null, href: `/users/${encodeURIComponent(resolvedUserPageUsername)}/history` },
        { label: "Stats", dashboard: "stats", href: `/users/${encodeURIComponent(resolvedUserPageUsername)}/stats` },
        { label: "News", dashboard: "news", href: `/users/${encodeURIComponent(resolvedUserPageUsername)}/news` },
        { label: "Read", dashboard: "read", href: `/users/${encodeURIComponent(resolvedUserPageUsername)}/read` },
      ]
    : [];
  const navigationLinks = [
    viewerMenuInfo
      ? { label: "Leaderboard", href: "/", dashboard: null }
      : null,
    ...dashboardPageLinks,
  ].filter((link): link is { label: string; href: string; dashboard: "learn" | "wk" | "jlpt" | "stats" | "news" | "read" | null } => Boolean(link));
  const pageLinks = [
    viewerMenuInfo && resolvedUserPageUsername
      ? { label: "News stats", href: `/users/${encodeURIComponent(resolvedUserPageUsername)}/news?read=stats` }
      : null,
    viewerMenuInfo && resolvedUserPageUsername
      ? { label: "News history", href: `/users/${encodeURIComponent(resolvedUserPageUsername)}/news?read=history` }
      : null,
    viewerMenuInfo && resolvedUserPageUsername
      ? { label: "My page", href: `/users/${encodeURIComponent(resolvedUserPageUsername)}` }
      : null,
  ].filter((link): link is { label: string; href: string } => Boolean(link));
  const adminLinks = [
    adminSignedIn && !showAdminActions
      ? { label: "Admin", href: "/admin" }
      : null,
    showAdminActions
      ? { label: "Admin", href: "/admin" }
      : null,
    showAdminActions
      ? { label: "Manage users", href: "/admin/users" }
      : null,
  ].filter((link): link is { label: string; href: string } => Boolean(link));
  const canRefreshLeaderboard = adminSignedIn || showAdminActions;

  async function refreshLeaderboard() {
    setRefreshingLeaderboard(true);
    try {
      const response = await fetch("/api/leaderboard/refresh", { method: "POST" });
      if (!response.ok) {
        throw new Error("Refresh failed.");
      }

      router.refresh();
      setOpen(false);
    } catch {
      // Keep the menu stable and avoid noisy UI errors.
    } finally {
      setRefreshingLeaderboard(false);
    }
  }

  function linkIsActive(href: string): boolean {
    if (!pathname) {
      return false;
    }

    if (href === "/") {
      return pathname === "/";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div ref={menuRef} className="relative z-10">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Open user menu"
        title="Menu"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-full border border-line bg-surface text-lg font-bold text-foreground transition hover:bg-surface-muted"
      >
        ≡
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
          <>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[9990] bg-foreground/20 backdrop-blur-[1px]"
            />
            <aside ref={panelRef} className="fixed inset-x-3 bottom-3 top-3 z-[9991] overflow-y-auto rounded-2xl border border-line bg-surface p-3 shadow-[0_18px_40px_rgba(8,16,36,0.22)] sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-24 sm:w-[min(88vw,320px)] sm:max-h-[calc(100dvh-7rem)]">
            <div className="space-y-3">
            <section>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">Account</p>
              {viewerMenuInfo ? (
                <>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/60">
                    {viewerMenuInfo.provider === "google" ? "Signed in with Google" : "Invite session"}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-line bg-surface-muted text-[11px] font-black text-foreground">
                      {getInitials(viewerMenuInfo.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-foreground">{viewerMenuInfo.name}</p>
                      {viewerMenuInfo.email ? (
                        <p className="truncate text-xs text-foreground/70">{viewerMenuInfo.email}</p>
                      ) : null}
                      {hasSyncStatus ? (
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground/55">
                          Updated {updatedRelativeLabel}
                          <span className="mx-2 text-foreground/35">|</span>
                          Active {activeRelativeLabel}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {viewerMenuInfo.wkUsername ? (
                    <p className="mt-1 text-xs text-foreground/70">@{viewerMenuInfo.wkUsername}</p>
                  ) : null}
                </>
              ) : (
                <p className="mt-1 text-sm font-semibold text-foreground/80">Not signed in</p>
              )}
            </section>

            {navigationLinks.length > 0 ? (
              <section className="border-t border-line pt-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-foreground/60">Navigation</p>
                <div className={MENU_LIST_GROUP_CLASS}>
                  {navigationLinks.map((link, index) => {
                    const active = link.dashboard
                      ? isOnResolvedUserDashboard && currentDashboardTab === link.dashboard
                      : linkIsActive(link.href);

                    return (
                      <Link
                        key={link.label}
                        href={link.href}
                        onClick={(event) => {
                          if (
                            link.dashboard &&
                            isOnResolvedUserDashboard &&
                            isPlainLeftClick(event)
                          ) {
                            event.preventDefault();
                            window.dispatchEvent(
                              new CustomEvent("wr:dashboard-tab-request", {
                                detail: { tab: link.dashboard },
                              }),
                            );
                          }
                          setOpen(false);
                        }}
                        className={`${MENU_LIST_ITEM_CLASS} ${index > 0 ? MENU_LIST_ITEM_DIVIDER_CLASS : ""} ${active ? MENU_LIST_ITEM_ACTIVE_CLASS : ""}`}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {pageLinks.length > 0 ? (
              <section className="border-t border-line pt-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-foreground/60">Pages</p>
                <div className={MENU_LIST_GROUP_CLASS}>
                  {pageLinks.map((link, index) => (
                    <Link
                      key={link.label}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className={`${MENU_LIST_ITEM_CLASS} ${index > 0 ? MENU_LIST_ITEM_DIVIDER_CLASS : ""} ${linkIsActive(link.href) ? MENU_LIST_ITEM_ACTIVE_CLASS : ""}`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {adminLinks.length > 0 ? (
              <section className="border-t border-line pt-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-foreground/60">Admin</p>
                <div className={MENU_LIST_GROUP_CLASS}>
                  {adminLinks.map((link, index) => (
                    <Link
                      key={link.label}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className={`${MENU_LIST_ITEM_CLASS} ${index > 0 ? MENU_LIST_ITEM_DIVIDER_CLASS : ""} ${linkIsActive(link.href) ? MENU_LIST_ITEM_ACTIVE_CLASS : ""}`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
                {canRefreshLeaderboard ? (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        refreshLeaderboard().catch(() => {
                          // Handled in refreshLeaderboard.
                        });
                      }}
                      disabled={refreshingLeaderboard}
                      className={MENU_BUTTON_CLASS}
                    >
                      {refreshingLeaderboard ? "Refreshing leaderboard..." : "Refresh leaderboard"}
                    </button>
                  </div>
                ) : null}
              </section>
            ) : null}

            {viewerMenuInfo ? (
              <section className="border-t border-line pt-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-foreground/60">Preferences</p>
                <div className="mt-2 space-y-1.5">
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className={MENU_BUTTON_CLASS}
                  >
                    Theme: {themeMode === "light" ? "Light" : "Dark"}
                  </button>

                  <button
                    type="button"
                    onClick={toggleJpFont}
                    className={MENU_BUTTON_CLASS}
                  >
                    JP Font: {jpFontMode === "sans" ? "Sans" : "Serif"}
                  </button>
                </div>
              </section>
            ) : null}

            <section className="border-t border-line pt-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-foreground/60">Actions</p>
              <div className="mt-2 space-y-1.5">
                {accountId ? (
                  <UserAdminRefreshButton
                    accountId={accountId}
                    label="Refresh user"
                    ariaLabel="Refresh user"
                    showMessage={false}
                    buttonClassName={MENU_BUTTON_CLASS}
                  />
                ) : null}

                {viewerMenuInfo?.provider === "google" ? (
                  <Link
                    href="/signout?callbackUrl=/"
                    className={MENU_BUTTON_CLASS}
                  >
                    Sign out
                  </Link>
                ) : viewerMenuInfo?.provider === "invite" ? (
                  <Link
                    href="/invite"
                    className={MENU_BUTTON_CLASS}
                  >
                    Manage invite
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className={MENU_BUTTON_CLASS}
                    >
                      Login with Google
                    </Link>
                    <Link
                      href="/invite"
                      className={MENU_BUTTON_CLASS}
                    >
                      Use invite code
                    </Link>
                  </>
                )}
              </div>
            </section>
            </div>
            </aside>
          </>,
          document.body,
        )
        : null}
    </div>
  );
}
