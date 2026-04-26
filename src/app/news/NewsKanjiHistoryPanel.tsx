"use client";

import { formatRelativeFromNow } from "@/lib/timeFormat";

import type { NewsKanjiHistoryEntry } from "./newsKanjiHistory";

type Props = {
  entries: NewsKanjiHistoryEntry[];
  onSelect: (run: string) => void;
  onRemove: (run: string) => void;
  onClear: () => void;
};

export default function NewsKanjiHistoryPanel({
  entries,
  onSelect,
  onRemove,
  onClear,
}: Props) {
  if (entries.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-line bg-surface-muted p-4 text-xs font-semibold uppercase tracking-[0.14em] text-foreground/55">
        No kanji click history yet.
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-foreground/70">
          News Kanji History
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
        {entries.map((entry) => (
          <li key={entry.run} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-muted">
            <button type="button" onClick={() => onSelect(entry.run)} className="flex-1 text-left">
              <p className="line-clamp-1 text-xl font-bold text-foreground">{entry.run}</p>
              <p className="mt-0.5 line-clamp-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground/55">
                {entry.hasVocabulary ? "vocab" : "kanji only"} · {entry.knownCount}/{entry.totalCount} known · {entry.clickCount} clicks · {formatRelativeFromNow(entry.lastClickedAt)}
              </p>
            </button>
            <button
              type="button"
              onClick={() => onRemove(entry.run)}
              aria-label={`Remove ${entry.run} from kanji history`}
              className="rounded-full border border-transparent px-2 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-foreground/45 transition hover:border-line hover:text-hot"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
