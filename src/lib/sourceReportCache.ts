import "server-only";

import type { SourceKey } from "@/lib/sourceCredits";
import type { SourceReport } from "@/lib/sourceReport";

/**
 * What we hold from each source, remembered for a few minutes.
 *
 * The two `/sources` pages are the most crawlable thing on the site: an index
 * plus a page each, all static prose over numbers that move once a week at
 * most. Uncached, every one of those views ran three Prisma reads and rebuilt
 * a border-pair Set for each of the three maps - so a crawler sweeping twelve
 * pages cost twelve times that, for figures that had not changed between the
 * first request and the last.
 *
 * Ten minutes because these are counts of a catalogue, not a queue: a sync
 * lands and the page is a few minutes behind, which nobody can perceive and no
 * reader is harmed by. An admin who has just triggered a re-import can clear
 * the entry rather than wait for it.
 *
 * The clock is deliberately not cached. `generatedAtMs` is what freshness is
 * measured against, so it is stamped fresh on the way out - otherwise a report
 * cached before midnight would keep saying "today" into the following morning.
 */
type CachedReport = {
  report: SourceReport;
  cachedAtMs: number;
};

const SOURCE_REPORT_TTL_MS = 10 * 60_000;
const cache = new Map<SourceKey, CachedReport>();

export function getSourceReportCacheTtlMs(): number {
  return SOURCE_REPORT_TTL_MS;
}

/**
 * The report for a source, loading it only when nothing fresh is held.
 *
 * A loader that throws is never cached: a source whose table is missing on one
 * environment should retry next request, not be remembered as broken for ten
 * minutes.
 */
export async function cachedSourceReport(
  key: SourceKey,
  load: (key: SourceKey) => Promise<SourceReport>,
): Promise<SourceReport> {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.cachedAtMs <= SOURCE_REPORT_TTL_MS) {
    return { ...cached.report, generatedAtMs: Date.now() };
  }

  const report = await load(key);
  cache.set(key, { report, cachedAtMs: Date.now() });
  return report;
}

/** Forgets one source, or all of them when no key is given. */
export function clearSourceReportCache(key?: SourceKey): void {
  if (key) cache.delete(key);
  else cache.clear();
}
