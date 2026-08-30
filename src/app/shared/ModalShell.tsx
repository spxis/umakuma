"use client";

import { useEffect, useRef, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";

import { MODAL_LAYERS, type ModalLayer } from "@/app/shared/modalLayers";
import { lockBodyScroll } from "@/lib/bodyScrollLock";

type Props = {
  children: ReactNode;
  /** Omit for a modal the user cannot dismiss, such as a running game. */
  onClose?: () => void;
  layer?: ModalLayer;
  /** Accessible name. Use `labelledBy` instead when a heading already names it. */
  label?: string;
  labelledBy?: string;
  /** Scrim weight. `heavy` is for modals that must fully own the screen. */
  scrim?: "light" | "medium" | "heavy";
  /** Padding around the panel, so small panels are not flush on mobile. */
  gutter?: "sm" | "md";
  /** Classes for the panel itself — its width, height and surface. */
  panelClassName?: string;
  /** For a panel sized at runtime, such as one fitted to the viewport. */
  panelStyle?: CSSProperties;
  /** Extra attributes for the panel, such as the data hooks other code reads. */
  panelProps?: HTMLAttributes<HTMLDivElement>;
  /**
   * Dismiss on a click beside the panel. Opt in for informational modals — a
   * list, a detail view, a preview. Leave it off for anything holding typed
   * input or a decision, where a stray click would discard work.
   */
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  lockScroll?: boolean;
};

const SCRIMS = {
  light: "bg-foreground/20 backdrop-blur-[1px]",
  medium: "bg-[rgba(6,12,26,0.5)] backdrop-blur-[1px]",
  heavy: "bg-black/60",
} as const;

const GUTTERS = { sm: "p-2 sm:p-4", md: "p-4 sm:p-6" } as const;

/**
 * The scrim, centring and dialog semantics every modal in the app needs.
 *
 * Fourteen components used to build this by hand, and they drifted: only four
 * locked background scrolling, three never closed on Escape, and eight never
 * set `aria-modal`, so a screen reader walked the page behind them. Those are
 * not styling differences, so they belong in one place rather than in each
 * modal's own copy of the overlay.
 *
 * Panels keep their own sizing through `panelClassName`; this owns only what
 * every modal shares.
 */
export default function ModalShell({
  children,
  onClose,
  layer = MODAL_LAYERS.page,
  label,
  labelledBy,
  scrim = "medium",
  gutter = "sm",
  panelClassName = "",
  panelStyle,
  panelProps,
  closeOnBackdrop = false,
  closeOnEscape = true,
  lockScroll = true,
}: Props) {
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!lockScroll) return;
    return lockBodyScroll();
  }, [lockScroll]);

  useEffect(() => {
    if (!onClose || !closeOnEscape) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeOnEscape, onClose]);

  return (
    <div
      ref={overlayRef}
      className={`fixed inset-0 ${layer} flex items-center justify-center ${SCRIMS[scrim]} ${GUTTERS[gutter]}`}
      /*
       * Only a press that both starts and ends on the backdrop closes it.
       * Checking the click alone dismisses the modal when a drag that began on
       * text inside the panel happens to finish outside it.
       */
      onMouseDown={(event) => {
        if (event.target !== event.currentTarget) return;
        overlayRef.current?.setAttribute("data-press-origin", "backdrop");
      }}
      onClick={(event) => {
        const origin = overlayRef.current?.getAttribute("data-press-origin");
        overlayRef.current?.removeAttribute("data-press-origin");
        if (!onClose || !closeOnBackdrop) return;
        if (event.target !== event.currentTarget || origin !== "backdrop") return;
        onClose();
      }}
    >
      <div
        {...panelProps}
        role="dialog"
        aria-modal="true"
        aria-label={labelledBy ? undefined : label}
        aria-labelledby={labelledBy}
        style={panelStyle}
        className={panelClassName}
      >
        {children}
      </div>
    </div>
  );
}
