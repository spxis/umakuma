import "server-only";

import { prisma } from "./prisma";
import { type SourceKey } from "./sourceCredits";
import { getSourceReportCacheTtlMs } from "./sourceReportCache";
import { resolveShowcase, showcaseSettingKey, type ShowcaseRow } from "./sourceShowcase";

/**
 * The rows a source shows, an admin's picks first.
 *
 * Overrides live in `SiteSetting` under one key per source, which already
 * exists and already has an admin editing pattern, so nothing here needs a
 * schema change. A source with no row stored falls back to the chosen
 * defaults, which is also what happens when a stored value has lost its shape.
 */
export async function loadShowcase(key: SourceKey): Promise<ShowcaseRow[]> {
  const row = await prisma.siteSetting
    .findUnique({ where: { key: showcaseSettingKey(key) }, select: { value: true } })
    .catch(() => null);
  return resolveShowcase(key, row?.value);
}

/**
 * Replace a source's picks, or clear them back to the defaults.
 *
 * The caller validates. Storing an empty list removes the row rather than
 * writing an empty array, so "no override" has one representation and not two.
 */
export async function saveShowcase(key: SourceKey, rows: ShowcaseRow[]): Promise<void> {
  const settingKey = showcaseSettingKey(key);
  if (rows.length === 0) {
    await prisma.siteSetting.deleteMany({ where: { key: settingKey } });
  } else {
    const value = JSON.stringify(rows);
    await prisma.siteSetting.upsert({
      where: { key: settingKey },
      create: { key: settingKey, value },
      update: { value },
    });
  }
  /* After the write, never before: a read landing in between would put the
     old rows straight back and hold them for the rest of the window. */
  clearShowcaseCache(key);
}

/**
 * The same rows, held as long as the report beside them.
 *
 * What every public page should call. The showcase is one `SiteSetting` read
 * per view, which would quietly undo the caching the reports just got: a
 * crawler sweeping twelve pages would be back to twelve round trips for rows
 * that change when an admin decides they should, and no more often. Saving
 * clears the source's entry, so an admin sees their own pick immediately.
 */
const cache = new Map<SourceKey, { rows: ShowcaseRow[]; cachedAtMs: number }>();

export async function loadCachedShowcase(key: SourceKey): Promise<ShowcaseRow[]> {
  const held = cache.get(key);
  if (held && Date.now() - held.cachedAtMs <= getSourceReportCacheTtlMs()) return held.rows;

  const rows = await loadShowcase(key);
  cache.set(key, { rows, cachedAtMs: Date.now() });
  return rows;
}

/** Forgets one source's rows, or all of them when no key is given. */
export function clearShowcaseCache(key?: SourceKey): void {
  if (key) cache.delete(key);
  else cache.clear();
}
