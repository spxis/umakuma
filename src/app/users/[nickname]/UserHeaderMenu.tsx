"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatRelativeFromNow } from "@/lib/timeFormat";
import { buildHeaderMenu } from "@/app/shared/headerMenuModel";
import InviteSessionActions from "./InviteSessionActions";
import UserAdminRefreshButton from "./UserAdminRefreshButton";
import type { UserHeaderMenuProps } from "./UserHeaderMenu.types";
import { viewerAddress } from "@/app/shared/viewerAddress";
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
  const [open, setOpen] = useState(false);
  const [refreshingLeaderboard, setRefreshingLeaderboard] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
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

  const resolvedUserPageUsername = viewerAddress(viewerMenuInfo) ?? viewedWkUsername ?? null;
  const adminSignedIn = Boolean(viewerMenuInfo?.provider === "google" && viewerMenuInfo.isAdmin);
  /*
   * Every link in this menu comes from the same sections the header uses.
   * They used to be two hand-kept lists, and they had drifted: Practice and
   * Profile were in the header and missing here.
   */
  const menu = buildHeaderMenu({
    username: viewerMenuInfo ? resolvedUserPageUsername : null,
    isAdmin: adminSignedIn,
    showAdminActions,
  });
  const adminLinks = menu.admin;
  const canRefreshLeaderboard = adminSignedIn || showAdminActions;
  async function refreshLeaderboard() {
    setRefreshingLeaderboard(true);
    try {
      const response = await fetch("/api/admin/leaderboard/refresh", { method: "POST" });
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
            <aside ref={panelRef} className="fixed inset-x-[22px] bottom-[22px] top-[22px] z-[9991] overflow-y-auto rounded-2xl border border-line bg-surface p-3 shadow-[0_18px_40px_rgba(8,16,36,0.22)] sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-24 sm:w-[min(88vw,320px)] sm:max-h-[calc(100dvh-7rem)]">
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

            {menu.account.length > 0 ? (
              <section className="border-t border-line pt-3">
                <div className={MENU_LIST_GROUP_CLASS}>
                  {menu.account.map((link, index) => (
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

            {/*
              * Navigation, on small screens only. The header shows every
              * section on a desktop, so repeating them here was duplication -
              * and the duplicate had drifted out of date.
              */}
            {menu.navigate.length > 0 ? (
              <section className="border-t border-line pt-3 md:hidden">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-foreground/60">Go to</p>
                <div className="mt-2 space-y-3">
                  {menu.navigate.map((group) => (
                    <div key={group.label}>
                      {group.links.length > 1 ? (
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.1em] text-foreground/40">
                          {group.label}
                        </p>
                      ) : null}
                      <div className={MENU_LIST_GROUP_CLASS}>
                        {group.links.map((link, index) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setOpen(false)}
                            className={`${MENU_LIST_ITEM_CLASS} ${index > 0 ? MENU_LIST_ITEM_DIVIDER_CLASS : ""} ${linkIsActive(link.href) ? MENU_LIST_ITEM_ACTIVE_CLASS : ""}`}
                          >
                            {link.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {menu.site.length > 0 ? (
              <section className="border-t border-line pt-3">
                <div className={MENU_LIST_GROUP_CLASS}>
                  {menu.site.map((link, index) => (
                    <Link
                      key={link.href}
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

            {menu.settings.length > 0 ? (
              <section className="border-t border-line pt-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-foreground/60">Settings</p>
                <div className={MENU_LIST_GROUP_CLASS}>
                  {menu.settings.map((link, index) => (
                    <Link
                      key={link.href}
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
                  <InviteSessionActions buttonClassName={MENU_BUTTON_CLASS} />
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
