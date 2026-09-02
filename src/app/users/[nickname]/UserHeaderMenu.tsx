"use client";

import SignOutMenuItem from "@/app/shared/SignOutMenuItem";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { formatRelativeFromNow } from "@/lib/timeFormat";
import { buildHeaderMenu } from "@/app/shared/headerMenuModel";
import InviteSessionActions from "./InviteSessionActions";
import { MODAL_LAYERS } from "@/app/shared/modalLayers";
import UserAdminRefreshButton from "./UserAdminRefreshButton";
import type { UserHeaderMenuProps } from "./UserHeaderMenu.types";
import { viewerAddress } from "@/app/shared/viewerAddress";
/*
 * One row style for everything in the menu.
 *
 * Each cluster used to be a bordered card with a shouty uppercase heading over
 * it - ACCOUNT, GO TO, SETTINGS, ADMIN, ACTIONS - so a menu of a dozen links
 * read as five boxed lists. GitHub, Claude and WaniKani all do the same simpler
 * thing: one flat column of rows, with a hairline where the subject changes and
 * no heading at all. The clusters still exist, they just stop announcing
 * themselves.
 */
const MENU_ITEM_CLASS =
  "flex h-9 w-full items-center rounded-lg px-2.5 text-sm font-medium text-foreground transition hover:bg-surface-muted";
const MENU_ITEM_ACTIVE_CLASS = "bg-surface-muted font-black text-accent";
const MENU_RULE_CLASS = "my-1.5 border-t border-line/70";
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
    /* The menu is the viewer's own, so it answers for the viewer's own account. */
    access: { hasWanikani: Boolean(viewerMenuInfo?.hasWanikani) },
  });
  const adminLinks = menu.admin;

  /*
   * The menu as one column, clustered rather than boxed.
   *
   * Navigation repeats the header, so it is for small screens only - the
   * header already shows every section on a desktop, and listing them twice is
   * what let the two copies drift apart in the first place.
   */
  const menuClusters: Array<{
    id: string;
    links: { label: string; href: string }[];
    smallScreensOnly?: boolean;
  }> = [
    { id: "account", links: menu.account },
    { id: "navigate", links: menu.navigate.flatMap((group) => group.links), smallScreensOnly: true },
    { id: "settings", links: menu.settings },
    { id: "admin", links: adminLinks },
    { id: "site", links: menu.site },
  ].filter((cluster) => cluster.links.length > 0);
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
    <div ref={menuRef} className={`relative ${MODAL_LAYERS.headerAnchor}`}>
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

      {open ? (
        <>
          {/* Tap-away close. The panel hangs off the button rather than being
              pinned to a corner of the window, which is what made it read as
              floating loose of the header. */}
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className={`fixed inset-0 ${MODAL_LAYERS.headerScrim} cursor-default sm:bg-transparent`}
          />
          <aside
            ref={panelRef}
            role="menu"
            className={`fixed inset-x-3 top-16 max-h-[calc(100dvh-5rem)] overflow-y-auto rounded-2xl border border-line bg-surface p-2 shadow-[0_18px_40px_rgba(8,16,36,0.22)] ${MODAL_LAYERS.headerPanel} sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[17rem]`}
          >
            {/* Who you are, the way a user menu opens everywhere else: the name
                and the address under it, with no heading over the top. */}
            {viewerMenuInfo ? (
              <div className="flex items-center gap-2.5 px-2.5 py-2">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface-muted text-[11px] font-black text-foreground">
                  {getInitials(viewerMenuInfo.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black leading-tight text-foreground">{viewerMenuInfo.name}</p>
                  <p className="truncate text-xs leading-tight text-foreground/60">
                    {viewerMenuInfo.wkUsername ? `@${viewerMenuInfo.wkUsername}` : viewerMenuInfo.email ?? ""}
                  </p>
                </div>
              </div>
            ) : (
              <p className="px-2.5 py-2 text-sm font-semibold text-foreground/80">Not signed in</p>
            )}

            {hasSyncStatus ? (
              <p className="px-2.5 pb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground/60">
                Updated {updatedRelativeLabel}
                <span className="mx-1.5 text-foreground/30">|</span>
                Active {activeRelativeLabel}
              </p>
            ) : null}

            {menuClusters.map((cluster, clusterIndex) => (
              <div key={cluster.id} className={cluster.smallScreensOnly ? "md:hidden" : undefined}>
                <div className={clusterIndex === 0 ? "" : MENU_RULE_CLASS} />
                {cluster.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className={`${MENU_ITEM_CLASS} ${linkIsActive(link.href) ? MENU_ITEM_ACTIVE_CLASS : ""}`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ))}

            <div className={MENU_RULE_CLASS} />
            {accountId ? (
              <UserAdminRefreshButton
                accountId={accountId}
                label="Refresh user"
                ariaLabel="Refresh user"
                showMessage={false}
                buttonClassName={MENU_ITEM_CLASS}
              />
            ) : null}
            {canRefreshLeaderboard ? (
              <button type="button" onClick={refreshLeaderboard} className={MENU_ITEM_CLASS}>
                {refreshingLeaderboard ? "Refreshing leaderboard..." : "Refresh leaderboard"}
              </button>
            ) : null}

            {viewerMenuInfo?.provider === "google" ? (
              <SignOutMenuItem className={MENU_ITEM_CLASS} />
            ) : viewerMenuInfo?.provider === "invite" ? (
              <InviteSessionActions buttonClassName={MENU_ITEM_CLASS} />
            ) : (
              <>
                <Link href="/login" role="menuitem" className={MENU_ITEM_CLASS}>Login with Google</Link>
                <Link href="/invite" role="menuitem" className={MENU_ITEM_CLASS}>Use invite code</Link>
              </>
            )}
          </aside>
        </>
      ) : null}
    </div>
  );
}
