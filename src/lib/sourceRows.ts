import "server-only";

import { SOURCE_KEYS, type SourceKey } from "./sourceCredits";
import type { ShowcaseRow } from "./sourceShowcase";
import {
  curriculumRows,
  jitenRows,
  jmdictRows,
  kanjiapiRows,
  kanjidic2Rows,
  kanjivgRows,
  mapRows,
  radkfileRows,
  tatoebaRows,
  wanikaniRows,
} from "./sourceRowReaders";

/**
 * One source's rows, searched and paged.
 *
 * The admin picks the showcase from here rather than typing it, so what the
 * public card ends up saying is a line this file built out of the data. That
 * is the whole reason the browser exists: a hand-typed figure was right the
 * afternoon somebody looked it up, and thirteen of them were wrong by the time
 * anybody checked.
 *
 * Reading a source is not cheap - Tatoeba is a quarter of a million rows and
 * the frequency file needs sixty catalogue files behind it - so a source's
 * rows are built once and held. They change when a script runs, which is not
 * during a browsing session.
 */

export const ROWS_PAGE_SIZE = 20;
/** How long a built source stays in memory. Long, because rebuilding is the cost. */
const ROWS_TTL_MS = 10 * 60_000;

export type SourceRowsPage = {
  rows: ShowcaseRow[];
  total: number;
  page: number;
  pageSize: number;
};

const cache = new Map<SourceKey, { rows: ShowcaseRow[]; cachedAtMs: number }>();

async function buildRows(key: SourceKey): Promise<ShowcaseRow[]> {
  switch (key) {
    case SOURCE_KEYS.wanikani:
      return wanikaniRows();
    case SOURCE_KEYS.kanjidic2:
      return kanjidic2Rows();
    case SOURCE_KEYS.radkfile:
      return radkfileRows();
    case SOURCE_KEYS.kanjivg:
      return kanjivgRows();
    case SOURCE_KEYS.kanjiapi:
      return kanjiapiRows();
    case SOURCE_KEYS.tatoeba:
      return tatoebaRows();
    case SOURCE_KEYS.jmdict:
      return jmdictRows();
    case SOURCE_KEYS.jiten:
      return jitenRows();
    case SOURCE_KEYS.curriculum:
      return curriculumRows();
    case SOURCE_KEYS.jpmap:
      return mapRows("JP");
    case SOURCE_KEYS.usmap:
      return mapRows("US");
    case SOURCE_KEYS.worldmap:
      return mapRows("CA");
  }
}

async function allRows(key: SourceKey): Promise<ShowcaseRow[]> {
  const held = cache.get(key);
  if (held && Date.now() - held.cachedAtMs <= ROWS_TTL_MS) return held.rows;
  const rows = await buildRows(key);
  cache.set(key, { rows, cachedAtMs: Date.now() });
  return rows;
}

/** Forgets one source's rows, or all of them. Used after an import. */
export function clearSourceRowsCache(key?: SourceKey): void {
  if (key) cache.delete(key);
  else cache.clear();
}

/**
 * Matching is on the specimen and the detail both, because the useful search
 * here is as often "which rows mention Nagano" as "find 口".
 */
function matches(row: ShowcaseRow, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return row.specimen.toLowerCase().includes(needle) || row.detail.toLowerCase().includes(needle);
}

export async function sourceRowsPage(
  key: SourceKey,
  { page = 1, query = "" }: { page?: number; query?: string } = {},
): Promise<SourceRowsPage> {
  const rows = await allRows(key);
  const found = query ? rows.filter((row) => matches(row, query)) : rows;
  /* A page past the end shows the last one rather than nothing, so a stale
     page number in a URL is a small surprise instead of an empty table. */
  const pages = Math.max(1, Math.ceil(found.length / ROWS_PAGE_SIZE));
  const wanted = Math.min(Math.max(1, page), pages);
  const start = (wanted - 1) * ROWS_PAGE_SIZE;

  return {
    rows: found.slice(start, start + ROWS_PAGE_SIZE),
    total: found.length,
    page: wanted,
    pageSize: ROWS_PAGE_SIZE,
  };
}
