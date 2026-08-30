"use client";

import { APP_VERSION } from "@/lib/appVersion";

export default function AppFooter() {
  return (
    <footer className="relative z-20 mt-8 border-t border-line/70 bg-surface/70 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold text-foreground/85">UmaKuma. Built for steady daily progress.</p>
        <p className="text-xs font-semibold tabular-nums text-foreground/40">v{APP_VERSION}</p>
      </div>
    </footer>
  );
}
