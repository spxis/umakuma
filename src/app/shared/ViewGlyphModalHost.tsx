"use client";

import { useEffect, useMemo, useState } from "react";

import type { StudyQueueItem } from "@/app/users/[nickname]/study-explorer/lib/studyExplorerTypes";
import { jlptLevelPillClass, shortSubjectTypeLabel, statusClass, statusShortLabel, subjectTypePillClass, typeGlyphBoxClass } from "@/app/users/[nickname]/level-explorer/lib/levelExplorerDisplay";
import { useGlyphFontPreference } from "@/lib/glyphFontPreference";
import { VIEW_GLYPH_EVENT, type ViewGlyphViewerPayload } from "@/lib/viewGlyphViewer";

function viewerTitle(item: StudyQueueItem): string {
  if (item.subjectType === "kanji") return "View Glyph - Kanji";
  if (item.subjectType === "radical") return "View Glyph - Radical";
  return "View Glyph - Vocabulary";
}

export default function ViewGlyphModalHost() {
  const [items, setItems] = useState<StudyQueueItem[]>([]);
  const [index, setIndex] = useState(0);
  const [customTitle, setCustomTitle] = useState<string | undefined>(undefined);
  const { fontFamily, toggle } = useGlyphFontPreference();

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<ViewGlyphViewerPayload>).detail;
      if (!detail?.items || detail.items.length === 0) {
        return;
      }

      setItems(detail.items);
      setIndex(Math.max(0, Math.min(detail.startIndex ?? 0, detail.items.length - 1)));
      setCustomTitle(detail.title);
    };

    window.addEventListener(VIEW_GLYPH_EVENT, onOpen);
    return () => {
      window.removeEventListener(VIEW_GLYPH_EVENT, onOpen);
    };
  }, []);

  const item = items[index] ?? null;
  const reading = useMemo(() => {
    if (!item) return "-";
    const primary = item.primaryReadings?.[0];
    if (primary && primary.trim().length > 0) return primary;
    const alt = item.readings?.[0];
    if (alt && alt.trim().length > 0) return alt;
    return "-";
  }, [item]);

  const meaning = useMemo(() => {
    if (!item) return "-";
    const primary = item.meanings?.[0];
    return primary && primary.trim().length > 0 ? primary : "-";
  }, [item]);

  if (!item) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[90] bg-[rgba(6,12,26,0.56)] p-3 backdrop-blur-[1px] sm:p-6">
      <div className="mx-auto flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_20px_65px_rgba(0,0,0,0.42)]">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-line bg-surface-muted px-3 py-2 sm:px-4">
          <button
            type="button"
            onClick={() => {
              setItems([]);
              setIndex(0);
              setCustomTitle(undefined);
            }}
            className="rounded-full border border-line bg-surface px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-foreground hover:bg-surface-muted"
          >
            Close
          </button>
          <p className="truncate text-center text-xs font-black uppercase tracking-[0.1em] text-foreground/80 sm:text-sm">
            {customTitle ?? viewerTitle(item)}
          </p>
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIndex((prev) => Math.max(0, prev - 1))}
              disabled={index <= 0}
              className="rounded-full border border-line bg-surface px-2 py-1 text-[11px] font-black uppercase text-foreground disabled:opacity-40"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setIndex((prev) => Math.min(items.length - 1, prev + 1))}
              disabled={index >= items.length - 1}
              className="rounded-full border border-line bg-surface px-2 py-1 text-[11px] font-black uppercase text-foreground disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 sm:p-4">
          <div className={`rounded-2xl border p-4 ${typeGlyphBoxClass(item.subjectType)}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex flex-wrap items-center gap-1">
                <span className={subjectTypePillClass(item.subjectType)}>{shortSubjectTypeLabel(item.subjectType)}</span>
                {typeof item.wkLevel === "number" ? <span className="subject-pill border-line bg-surface text-foreground">L{item.wkLevel}</span> : null}
                {typeof item.jlptMeta?.schoolGrade === "number" ? <span className="subject-pill border-line bg-surface text-foreground">G{item.jlptMeta.schoolGrade}</span> : null}
                {item.jlptLevel ? <span className={jlptLevelPillClass()}>N{item.jlptLevel}</span> : null}
              </div>
              <button
                type="button"
                onClick={toggle}
                className="rounded-full border border-line bg-surface px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-foreground/80 hover:bg-surface-muted"
              >
                Font
              </button>
            </div>

            <p style={{ fontFamily }} className="mt-4 text-center text-[clamp(3rem,12vw,6.2rem)] font-black leading-none text-current">
              {item.characters}
            </p>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-line bg-surface-muted px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-foreground/65">Reading</p>
                <p className="mt-1 truncate text-xl font-black text-foreground/90">{reading}</p>
              </div>
              <div className="rounded-xl border border-line bg-surface-muted px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-foreground/65">Meaning</p>
                <p className="mt-1 truncate text-xl font-black text-foreground/90">{meaning}</p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${statusClass(item.status)}`}>{statusShortLabel(item.status)}</span>
              <span className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-bold text-foreground">SRS {item.srsStage}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
