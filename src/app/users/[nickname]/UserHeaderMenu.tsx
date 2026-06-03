"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import UserAdminRefreshButton from "./UserAdminRefreshButton";
import type { ViewerMenuInfo } from "./UserDashboardTabs.types";

type UserHeaderMenuProps = {
  accountId?: string;
  viewedWkUsername?: string;
  viewerMenuInfo: ViewerMenuInfo | null;
  showAdminActions?: boolean;
  hidden?: boolean;
};

const MENU_BUTTON_CLASS =
  "inline-flex h-8 w-full items-center justify-center rounded-full border border-line bg-surface-muted px-2.5 text-[11px] font-bold uppercase tracking-[0.1em] text-foreground transition hover:bg-surface";

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

export default function UserHeaderMenu({
  accountId,
  viewedWkUsername,
  viewerMenuInfo,
  showAdminActions = false,
  hidden = false,
}: UserHeaderMenuProps) {
  const [open, setOpen] = useState(false);
  const [googleSignedIn, setGoogleSignedIn] = useState(false);
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
    let cancelled = false;

    async function loadSessionStatus() {
      try {
        const response = await fetch("/api/admin/session", { cache: "no-store" });
        const data = (await response.json()) as { signedIn?: boolean };
        if (!cancelled) {
          setGoogleSignedIn(Boolean(data.signedIn));
        }
      } catch {
        if (!cancelled) {
          setGoogleSignedIn(false);
        }
      }
    }

    if (open) {
      void loadSessionStatus();
    }

    return () => {
      cancelled = true;
    };
  }, [open]);

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

  if (hidden) {
    return null;
  }

  const resolvedUserPageUsername = viewerMenuInfo?.wkUsername ?? viewedWkUsername ?? null;
  const dashboardPageLinks = resolvedUserPageUsername
    ? [
        { label: "Learn", href: `/users/${encodeURIComponent(resolvedUserPageUsername)}?dashboard=learn` },
        { label: "Stats", href: `/users/${encodeURIComponent(resolvedUserPageUsername)}?dashboard=stats` },
        { label: "News", href: `/users/${encodeURIComponent(resolvedUserPageUsername)}?dashboard=news` },
        { label: "Read", href: `/users/${encodeURIComponent(resolvedUserPageUsername)}?dashboard=read` },
      ]
    : [];
  const showNavigationSection = Boolean(viewerMenuInfo || viewedWkUsername || showAdminActions || resolvedUserPageUsername);

  return (
    <div ref={menuRef} className="relative z-[1200]">
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

            {showNavigationSection ? (
              <section className="border-t border-line pt-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-foreground/60">Navigation</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {viewerMenuInfo && viewedWkUsername ? (
                    <Link
                      href={`/users/${encodeURIComponent(viewedWkUsername)}/history`}
                      className={`${MENU_BUTTON_CLASS} col-span-2`}
                    >
                      History
                    </Link>
                  ) : null}
                  {viewerMenuInfo ? (
                    <Link
                      href="/"
                      className={MENU_BUTTON_CLASS}
                    >
                      Leaderboard
                    </Link>
                  ) : null}
                  {viewerMenuInfo ? (
                    <>
                      <Link
                        href="/news"
                        className={MENU_BUTTON_CLASS}
                      >
                        News
                      </Link>
                      <Link
                        href="/news/stats"
                        className={MENU_BUTTON_CLASS}
                      >
                        News stats
                      </Link>
                      <Link
                        href="/news/history"
                        className={MENU_BUTTON_CLASS}
                      >
                        News history
                      </Link>
                      <Link
                        href="/join"
                        className={MENU_BUTTON_CLASS}
                      >
                        Join
                      </Link>
                      <Link
                        href="/invite"
                        className={MENU_BUTTON_CLASS}
                      >
                        Invite
                      </Link>
                    </>
                  ) : null}
                  {showAdminActions ? (
                    <>
                      <Link
                        href="/admin"
                        className={MENU_BUTTON_CLASS}
                      >
                        Admin
                      </Link>
                      <Link
                        href="/admin/users"
                        className={MENU_BUTTON_CLASS}
                      >
                        Manage users
                      </Link>
                    </>
                  ) : null}
                  {viewerMenuInfo && resolvedUserPageUsername ? (
                    <Link
                      href={`/users/${encodeURIComponent(resolvedUserPageUsername)}`}
                      className={`${MENU_BUTTON_CLASS} col-span-2`}
                    >
                      My page
                    </Link>
                  ) : null}
                </div>

                {dashboardPageLinks.length > 0 ? (
                  <div className="mt-3 rounded-xl border border-line bg-surface-muted/70 p-2">
                    <p className="px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-foreground/60">
                      Top pages
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {dashboardPageLinks.map((link) => (
                        <Link
                          key={link.label}
                          href={link.href}
                          className="inline-flex h-8 items-center justify-center rounded-full border border-line bg-surface px-2.5 text-[11px] font-bold uppercase tracking-[0.1em] text-foreground transition hover:bg-surface-muted"
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
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
                ) : googleSignedIn ? (
                  <>
                    <Link
                      href="/join"
                      className={MENU_BUTTON_CLASS}
                    >
                      Continue with session
                    </Link>
                    <Link
                      href="/signout?callbackUrl=/"
                      className={MENU_BUTTON_CLASS}
                    >
                      Sign out
                    </Link>
                  </>
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
