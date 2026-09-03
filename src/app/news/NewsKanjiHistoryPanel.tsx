"use client";

import { SUBJECT_TYPES } from "@/lib/domainConstants";
import { formatRelativeFromNow } from "@/lib/timeFormat";

import SubjectPill from "@/app/shared/SubjectPill";
import type { NewsKanjiHistoryPanelProps } from "./NewsKanjiHistoryPanel.types";

const KANJI_REGEX = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/;

function uniqueKanji(run: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const char of Array.from(run)) {
    if (!KANJI_REGEX.test(char) || seen.has(char)) {
      continue;
    }
    seen.add(char);
    out.push(char);
  }
  return out;
}

export default function NewsKanjiHistoryPanel({
  entries,
  onSelect,
  onRemove,
  onClear,
}: NewsKanjiHistoryPanelProps) {
  if (entries.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-line bg-surface-muted p-4 text-xs font-semibold uppercase tracking-[0.14em] text-foreground/60">
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
          className="text-[11px] font-bold uppercase tracking-[0.12em] text-foreground/60 transition hover:text-hot"
        >
          Clear all
        </button>
      </header>

      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {entries.map((entry) => (
          <li key={entry.run} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-muted">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {entry.hasVocabulary ? (
                  <SubjectPill
                    glyph={entry.run}
                    subjectType={SUBJECT_TYPES.vocabulary}
                    label={`Open vocabulary ${entry.run}`}
                    onClick={() => onSelect(entry.run)}
                  />
                ) : null}

                {uniqueKanji(entry.run).map((char) => (
                  <SubjectPill
                    key={`${entry.run}-${char}`}
                    glyph={char}
                    subjectType={SUBJECT_TYPES.kanji}
                    label={`Open kanji ${char}`}
                    onClick={() => onSelect(char)}
                  />
                ))}
              </div>
              <p className="mt-0.5 line-clamp-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground/60">
                {entry.hasVocabulary ? "vocab" : "kanji only"} · {entry.knownCount}/{entry.totalCount} known · {entry.clickCount} clicks · {formatRelativeFromNow(entry.lastClickedAt)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onRemove(entry.run)}
              aria-label={`Remove ${entry.run} from kanji history`}
              className="rounded-full border border-transparent px-2 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-foreground/60 transition hover:border-line hover:text-hot"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
