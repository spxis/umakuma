"use client";

import { useEffect, useMemo, useState } from "react";

import { formatRelativeFromNow } from "@/lib/timeFormat";

import { openNewsGlyphRun } from "../newsGlyphRunner";
import {
  NEWS_KANJI_HISTORY_EVENT,
  clearNewsKanjiHistory,
  readNewsKanjiHistory,
  removeNewsKanjiHistory,
  type NewsKanjiHistoryEntry,
} from "../newsKanjiHistory";

type Filter = "all" | "vocab" | "kanji-only";

export default function NewsHistoryViewerClient() {
  const [entries, setEntries] = useState<NewsKanjiHistoryEntry[]>([]);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    const refresh = () => setEntries(readNewsKanjiHistory());
    refresh();
    window.addEventListener(NEWS_KANJI_HISTORY_EVENT, refresh);
    return () => {
      window.removeEventListener(NEWS_KANJI_HISTORY_EVENT, refresh);
    };
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") {
      return entries;
    }
    if (filter === "vocab") {
      return entries.filter((entry) => entry.hasVocabulary);
    }
    return entries.filter((entry) => !entry.hasVocabulary);
  }, [entries, filter]);

  return (
    <section className="space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex overflow-hidden rounded-full border border-line bg-surface-muted text-[11px] font-bold uppercase tracking-[0.12em]">
          <button type="button" onClick={() => setFilter("all")} className={`px-3 py-1 ${filter === "all" ? "bg-accent text-surface" : "text-foreground/70"}`}>All</button>
          <button type="button" onClick={() => setFilter("vocab")} className={`px-3 py-1 ${filter === "vocab" ? "bg-accent text-surface" : "text-foreground/70"}`}>Vocab</button>
          <button type="button" onClick={() => setFilter("kanji-only")} className={`px-3 py-1 ${filter === "kanji-only" ? "bg-accent text-surface" : "text-foreground/70"}`}>Kanji only</button>
        </div>
        <button
          type="button"
          onClick={() => {
            clearNewsKanjiHistory();
            setEntries([]);
          }}
          className="text-[11px] font-bold uppercase tracking-[0.12em] text-foreground/55 transition hover:text-hot"
        >
          Clear all
        </button>
      </header>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface-muted p-4 text-sm text-foreground/60">
          No clicked glyph history yet.
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {filtered.map((entry) => (
            <li key={entry.run} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-muted">
              <button type="button" onClick={() => void openNewsGlyphRun(entry.run)} className="flex-1 text-left">
                <p className="line-clamp-1 text-xl font-bold text-foreground">{entry.run}</p>
                <p className="mt-0.5 line-clamp-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground/55">
                  {entry.hasVocabulary ? "vocab" : "kanji only"} · {entry.knownCount}/{entry.totalCount} known · {entry.clickCount} opens · {formatRelativeFromNow(entry.lastClickedAt)}
                </p>
              </button>
              <button
                type="button"
                onClick={() => setEntries(removeNewsKanjiHistory(entry.run))}
                className="rounded-full border border-transparent px-2 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-foreground/45 transition hover:border-line hover:text-hot"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
