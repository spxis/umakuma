"use client";

import { useEffect, useState } from "react";

const JP_FONT_STORAGE_KEY = "wr:jp-font";

type JpFontMode = "sans" | "serif";

export default function AppFooter() {
  const [jpFontMode, setJpFontMode] = useState<JpFontMode>("sans");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(JP_FONT_STORAGE_KEY);
      const mode: JpFontMode = stored === "serif" ? "serif" : "sans";
      setJpFontMode(mode);
      document.documentElement.setAttribute("data-jp-font", mode);
    } catch {
      document.documentElement.setAttribute("data-jp-font", "sans");
    }
  }, []);

  function toggleJapaneseFont() {
    const next: JpFontMode = jpFontMode === "sans" ? "serif" : "sans";
    setJpFontMode(next);

    try {
      window.localStorage.setItem(JP_FONT_STORAGE_KEY, next);
    } catch {
      // Ignore storage errors in restricted browsing modes.
    }

    document.documentElement.setAttribute("data-jp-font", next);
  }

  return (
    <footer className="mt-8 border-t border-line/70 bg-white/70 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold text-slate-700">WaniRanks. Built for steady daily progress.</p>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">JP Font</span>
          <button
            type="button"
            onClick={toggleJapaneseFont}
            className="rounded-full border border-line bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-slate-700"
          >
            {jpFontMode === "sans" ? "Sans" : "Serif"}
          </button>
        </div>
      </div>
    </footer>
  );
}
