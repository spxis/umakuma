"use client";

import { useEffect, useRef, useState } from "react";
import {
  getClientApiActiveCount,
  installClientApiActivityTracker,
  subscribeToClientApiActivity,
} from "@/lib/clientApiActivity";

const SHOW_DELAY_MS = 180;
const MIN_VISIBLE_MS = 280;

export default function ClientApiActivityHint() {
  const [activeCount, setActiveCount] = useState(() => getClientApiActiveCount());
  const [visible, setVisible] = useState(false);
  const showTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const visibleSinceMsRef = useRef(0);

  const clearShowTimer = () => {
    if (showTimerRef.current !== null) {
      window.clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
  };

  const clearHideTimer = () => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  useEffect(() => {
    installClientApiActivityTracker();
    return subscribeToClientApiActivity(setActiveCount);
  }, []);

  useEffect(() => {
    if (activeCount > 0) {
      clearHideTimer();
      if (visible || showTimerRef.current !== null) {
        return;
      }

      showTimerRef.current = window.setTimeout(() => {
        visibleSinceMsRef.current = Date.now();
        setVisible(true);
        showTimerRef.current = null;
      }, SHOW_DELAY_MS);
      return;
    }

    clearShowTimer();
    if (!visible) {
      return;
    }

    const elapsedMs = Date.now() - visibleSinceMsRef.current;
    const remainingVisibleMs = Math.max(0, MIN_VISIBLE_MS - elapsedMs);
    hideTimerRef.current = window.setTimeout(() => {
      setVisible(false);
      hideTimerRef.current = null;
    }, remainingVisibleMs);
  }, [activeCount, visible]);

  useEffect(() => {
    return () => {
      clearShowTimer();
      clearHideTimer();
    };
  }, []);

  if (!visible) {
    return null;
  }

  // Bottom-left, away from the header: pinned top-right it sat on top of the
  // menu and the user button, on phones especially. A slim pill low in the
  // corner stays visible without covering anything interactive.
  return (
    <div className="pointer-events-none fixed bottom-3 left-3 z-120">
      <div
        role="status"
        aria-live="polite"
        className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground/80 shadow-[0_8px_18px_rgba(8,16,36,0.12)]"
      >
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" aria-hidden="true" />
        <span>Loading</span>
      </div>
    </div>
  );
}
