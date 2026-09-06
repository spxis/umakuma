"use client";

import { useEffect, useRef, useState } from "react";

import { MODAL_LAYERS } from "@/app/shared/modalLayers";

import {
  withXpToast,
  XP_TOAST_COPY as copy,
  XP_TOAST_EVENT,
  XP_TOAST_MS,
  type XpToast,
  type XpToastRequest,
} from "@/lib/xp/xpToast";

/**
 * The XP a member just earned, said once and then gone.
 *
 * Mounted once in the root layout and driven by an event, so any surface that
 * pays XP can raise one without the layout knowing what surfaces exist. It
 * draws nothing at all until something is earned.
 *
 * It stacks. A single review can pay twice - for answering and for being
 * right - and a burn or a level-up lands on top of that; one slot would show
 * the last only, or flicker, at exactly the moment there was most to say.
 *
 * `aria-live="polite"` rather than `assertive`: this is a courtesy, and
 * interrupting somebody mid-review to read them a number is not one.
 */
export default function XpToastHost() {
  const [toasts, setToasts] = useState<XpToast[]>([]);
  /* Ids are only ever compared with each other, so a counter is enough and
     avoids a random value differing between server and client. */
  const nextId = useRef(0);

  useEffect(() => {
    function onEarned(event: Event) {
      const detail = (event as CustomEvent<XpToastRequest>).detail;
      if (!detail || !Number.isFinite(detail.xp) || detail.xp <= 0) return;
      nextId.current += 1;
      const toast: XpToast = { id: `xp-${nextId.current}`, xp: detail.xp, reason: detail.reason };
      setToasts((held) => withXpToast(held, toast));
      window.setTimeout(() => {
        setToasts((held) => held.filter((entry) => entry.id !== toast.id));
      }, XP_TOAST_MS);
    }

    window.addEventListener(XP_TOAST_EVENT, onEarned);
    return () => window.removeEventListener(XP_TOAST_EVENT, onEarned);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label={copy.label}
      /* Out of the way of everything: it is not a modal and must never take a
         click meant for what is underneath it. */
      className={`pointer-events-none fixed inset-x-0 top-3 ${MODAL_LAYERS.xpToast} flex flex-col items-center gap-1.5 px-3`}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="xp-toast flex max-w-[min(22rem,calc(100vw-1.5rem))] items-baseline gap-2 rounded-full border border-accent/40 bg-surface/95 px-4 py-2 shadow-lg backdrop-blur"
        >
          <span className="shrink-0 text-sm font-black tabular-nums text-accent">
            {copy.amount(toast.xp)}
          </span>
          {toast.reason ? (
            <span className="min-w-0 truncate text-xs font-semibold text-foreground/70">{toast.reason}</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
