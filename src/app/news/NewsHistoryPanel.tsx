"use client";

import { formatRelativeFromNow } from "@/lib/timeFormat";

import type { NewsHistoryEntry } from "./newsHistory";

type Props = {
  entries: NewsHistoryEntry[];
  activeUrl: string | null;
  onSelect: (url: string) => void;
  onRemove: (url: string) => void;
  onClear: () => void;
};

export default function NewsHistoryPanel({
  entries,
  activeUrl,
  onSelect,
  onRemove,
  onClear,
}: Props) {
  if (entries.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-line bg-surface-muted p-4 text-xs font-semibold uppercase tracking-[0.14em] text-foreground/55">
        No history yet — articles you read will appear here.
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-foreground/70">
          History
        </p>
        <button
          type="button"
          onClick={onClear}
          className="text-[11px] font-bold uppercase tracking-[0.12em] text-foreground/55 transition hover:text-hot"
        >
          Clear all
        </button>
      </header>

      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {entries.map((entry) => {
          const isActive = entry.url === activeUrl;
          return (
            <li
              key={entry.url}
              className={`flex items-center gap-3 px-4 py-3 transition ${
                isActive ? "bg-surface-muted" : "hover:bg-surface-muted"
              }`}
            >
              <button
                type="button"
                onClick={() => onSelect(entry.url)}
                className="flex-1 text-left"
              >
                <p className="line-clamp-1 text-sm font-semibold text-foreground">
                  {entry.title || entry.url}
                </p>
                <p className="mt-0.5 line-clamp-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground/55">
                  {entry.siteName ?? hostnameOf(entry.url)} · {formatRelativeFromNow(entry.viewedAt)}
                </p>
              </button>
              <button
                type="button"
                onClick={() => onRemove(entry.url)}
                aria-label={`Remove ${entry.title || entry.url} from history`}
                className="rounded-full border border-transparent px-2 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-foreground/45 transition hover:border-line hover:text-hot"
              >
                Remove
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
