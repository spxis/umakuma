"use client";

import { useEffect, useState } from "react";
import {
  getClientApiActiveCount,
  installClientApiActivityTracker,
  subscribeToClientApiActivity,
} from "@/lib/clientApiActivity";

export default function ClientApiActivityHint() {
  const [activeCount, setActiveCount] = useState(() => getClientApiActiveCount());

  useEffect(() => {
    installClientApiActivityTracker();
    return subscribeToClientApiActivity(setActiveCount);
  }, []);

  if (activeCount <= 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-3 top-3 z-120">
      <div
        role="status"
        aria-live="polite"
        className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/95 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground shadow-[0_8px_18px_rgba(8,16,36,0.12)]"
      >
        <span className="h-2 w-2 animate-pulse rounded-full bg-accent" aria-hidden="true" />
        <span>Loading data...</span>
      </div>
    </div>
  );
}
