import { READING_KINDS } from "@/lib/domainConstants";
import { formatReading } from "@/lib/readingDisplay";

/**
 * What a surface knows about a character, on one line.
 *
 * Lives here rather than beside the stroke panel because both a client card
 * and the server-rendered page heading need it, and a function exported from a
 * `"use client"` module cannot be called during a server render.
 */
export type KanjiSummary = {
  /** The English meaning, if the surface knows one. */
  meaning?: string | null;
  /** On readings, already display-formatted. */
  on?: string[];
  /** Kun readings, already display-formatted. */
  kun?: string[];
};

/** Readings first, then the meaning. Null when nothing is known. */
export function summaryLine(summary: KanjiSummary | undefined): string | null {
  if (!summary) return null;

  /* On in katakana and kun in hiragana, so the line reads as two kinds, not one list. */
  const readings = [
    ...(summary.on ?? []).map((reading) => formatReading(READING_KINDS.on, reading)),
    ...(summary.kun ?? []).map((reading) => formatReading(READING_KINDS.kun, reading)),
  ].filter(Boolean);
  const parts = [readings.join("、"), summary.meaning?.trim()].filter(
    (part): part is string => Boolean(part && part.length > 0),
  );

  return parts.length > 0 ? parts.join(" · ") : null;
}
