"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { MODAL_LAYERS } from "@/app/shared/modalLayers";
import { ADMIN_USERS_COPY } from "./AdminUsers.constants";
import type { AdminAccountRowActionsProps } from "./AdminAccountsSection.types";

type MenuPosition = { top: number; right: number };

const MENU_GAP_PX = 6;
const MENU_EDGE_PX = 8;

/**
 * Every row action in one kebab menu. The menu panel is
 * position:fixed so the table's `overflow-x-auto` wrapper cannot clip it, and
 * it closes on outside press, Escape, scroll, resize, or selection.
 */
export default function AdminAccountRowActions({ nickname, actions, onSelect }: AdminAccountRowActionsProps) {
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const isOpen = position !== null;

  function toggleMenu() {
    if (isOpen) {
      setPosition(null);
      return;
    }

    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    setPosition({
      top: rect.bottom + MENU_GAP_PX,
      right: Math.max(MENU_EDGE_PX, window.innerWidth - rect.right),
    });
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const close = () => setPosition(null);

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }

      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) {
        return;
      }

      close();
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onEscape);
    // Capture-phase, so a scroll inside the table wrapper also closes it.
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onEscape);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [isOpen]);

  return (
    <div className="flex items-center gap-1.5">

      <button
        ref={buttonRef}
        type="button"
        onClick={toggleMenu}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={ADMIN_USERS_COPY.rowActions.menuButton(nickname)}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-base leading-none transition ${
          isOpen
            ? "border-accent/40 bg-accent/10 text-accent"
            : "border-line bg-white text-slate-700 hover:bg-surface"
        }`}
      >
        <span aria-hidden="true">⋯</span>
      </button>

      {isOpen ? (
        <div
          ref={panelRef}
          role="menu"
          aria-label={ADMIN_USERS_COPY.rowActions.menuButton(nickname)}
          style={{ top: position.top, right: position.right }}
          className={`fixed ${MODAL_LAYERS.menu} w-56 rounded-xl border border-line bg-surface p-1.5 shadow-[0_18px_42px_rgba(8,16,36,0.16)]`}
        >
          {actions.menu.map((action) => {
            const toneClass = action.destructive
              ? "text-red-700 hover:bg-red-50"
              : "text-foreground hover:bg-surface-muted";

            if (action.href && !action.disabled) {
              return (
                <Link
                  key={action.id}
                  role="menuitem"
                  href={action.href}
                  onClick={() => setPosition(null)}
                  className={`block w-full rounded-lg px-3 py-2 text-left text-xs font-bold uppercase tracking-[0.08em] transition ${toneClass}`}
                >
                  {action.label}
                </Link>
              );
            }

            return (
              <button
                key={action.id}
                type="button"
                role="menuitem"
                disabled={action.disabled}
                onClick={() => {
                  setPosition(null);
                  onSelect(action.id);
                }}
                className={`block w-full rounded-lg px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-55 ${toneClass}`}
              >
                <span className="block text-xs font-bold uppercase tracking-[0.08em]">{action.label}</span>
                {action.disabled && action.disabledReason ? (
                  <span className="mt-0.5 block text-[11px] font-semibold normal-case tracking-normal text-foreground/60">
                    {action.disabledReason}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
