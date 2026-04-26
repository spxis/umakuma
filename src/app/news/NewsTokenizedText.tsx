"use client";

import { useCallback } from "react";

import { openViewGlyphViewer } from "@/lib/viewGlyphViewer";
import type { LookupKanjiItem } from "@/lib/news/newsKanjiLookup";

import {
  readKanjiLookupCache,
  writeKanjiLookupCache,
} from "./newsKanjiCache";
import { tokenizeJapanese } from "./newsTokenize";

type Props = {
  text: string;
  emphasizeKanji: boolean;
};

export default function NewsTokenizedText({ text, emphasizeKanji }: Props) {
  const handleClick = useCallback(async (run: string) => {
    const chars = Array.from(run);
    const { hits, misses } = readKanjiLookupCache(chars);
    let resolved: Record<string, LookupKanjiItem> = { ...hits };
    let accountId = "";

    if (misses.length > 0) {
      try {
        const response = await fetch("/api/news/lookup-kanji", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chars: misses }),
        });
        const payload = (await response.json().catch(() => null)) as
          | { accountId?: string; items?: LookupKanjiItem[]; error?: string }
          | null;

        if (response.ok && payload?.items) {
          accountId = payload.accountId ?? "";
          writeKanjiLookupCache(payload.items);
          for (const item of payload.items) {
            resolved[item.char] = item;
          }
        }
      } catch {
        // swallow — we'll just open with whatever we have (possibly nothing)
      }
    }

    const items = chars
      .map((char) => resolved[char])
      .filter((item): item is LookupKanjiItem => Boolean(item) && item.subjectId !== null)
      .map((item) => ({
        assignmentId: -1,
        queueType: "review" as const,
        subjectId: item.subjectId as number,
        subjectType: "kanji" as const,
        wkLevel: item.wkLevel ?? undefined,
        characters: item.char,
        meanings: item.meanings.length > 0 ? item.meanings : ["-"],
        readings: item.readings,
        primaryReadings: item.primaryReadings,
        radicals: [],
        visuallySimilar: [],
        usedInVocabulary: [],
        componentKanji: [],
        meaningExplanation: item.meaningExplanation || undefined,
        readingExplanation: item.readingExplanation || undefined,
        jlptLevel: null,
        jlptMeta: null,
        srsStage: 0,
        status: "locked" as const,
        startedAt: null,
        passedAt: null,
        availableAt: null,
      }));

    if (items.length === 0) {
      return;
    }

    openViewGlyphViewer({
      accountId,
      items,
      startIndex: 0,
      title: items.length > 1 ? `Compound · ${run}` : `View ${run}`,
    });
  }, []);

  const segments = tokenizeJapanese(text);
  if (segments.length === 0) {
    return <>{text}</>;
  }

  return (
    <>
      {segments.map((segment, index) => {
        if (segment.kind !== "kanji") {
          return <span key={index}>{segment.text}</span>;
        }
        const sizeClass = emphasizeKanji ? "text-[1.2em] leading-none" : "";
        return (
          <button
            key={index}
            type="button"
            onClick={() => void handleClick(segment.text)}
            className={`group relative inline cursor-pointer align-baseline text-foreground transition hover:text-accent ${sizeClass}`.trim()}
            title={`Look up ${segment.text}`}
          >
            <span className="rounded-sm group-hover:bg-accent/10 group-focus-visible:bg-accent/10">
              {segment.text}
            </span>
          </button>
        );
      })}
    </>
  );
}
