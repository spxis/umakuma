import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SOURCE_KEYS } from "@/lib/sourceCredits";
import {
  cachedSourceReport,
  clearSourceReportCache,
  getSourceReportCacheTtlMs,
} from "@/lib/sourceReportCache";
import type { SourceReport } from "@/lib/sourceReport";

const report = (value: number): SourceReport => ({
  key: SOURCE_KEYS.radkfile,
  counts: [{ label: "Classical radicals", value }],
  lastImportedAt: null,
  version: null,
  generatedAtMs: 0,
});

/**
 * The accreditation pages are the most crawlable thing on the site and every
 * view used to cost three Prisma reads. Holding the answer for a few minutes
 * is the whole fix, so what it holds and for how long is worth pinning.
 */
describe("the source report cache", () => {
  beforeEach(() => {
    clearSourceReportCache();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-04T00:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
    clearSourceReportCache();
  });

  it("asks once and answers twice", async () => {
    const load = vi.fn().mockResolvedValue(report(253));
    await cachedSourceReport(SOURCE_KEYS.radkfile, load);
    const second = await cachedSourceReport(SOURCE_KEYS.radkfile, load);
    expect(load).toHaveBeenCalledTimes(1);
    expect(second.counts[0].value).toBe(253);
  });

  it("asks again once the answer is stale", async () => {
    const load = vi.fn().mockResolvedValue(report(253));
    await cachedSourceReport(SOURCE_KEYS.radkfile, load);
    vi.advanceTimersByTime(getSourceReportCacheTtlMs() + 1);
    await cachedSourceReport(SOURCE_KEYS.radkfile, load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  /* Freshness is read against this clock, so a report cached before midnight
     must not go on saying "today" the next morning. */
  it("stamps the clock fresh even on a cached answer", async () => {
    const load = vi.fn().mockResolvedValue(report(253));
    await cachedSourceReport(SOURCE_KEYS.radkfile, load);
    vi.advanceTimersByTime(60_000);
    const second = await cachedSourceReport(SOURCE_KEYS.radkfile, load);
    expect(second.generatedAtMs).toBe(Date.now());
  });

  /* A table missing on one environment should retry, not be remembered as
     broken for ten minutes. */
  it("never remembers a failure", async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error("no table")).mockResolvedValue(report(253));
    await expect(cachedSourceReport(SOURCE_KEYS.radkfile, load)).rejects.toThrow("no table");
    const second = await cachedSourceReport(SOURCE_KEYS.radkfile, load);
    expect(second.counts[0].value).toBe(253);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("keeps each source apart, and forgets one without forgetting the rest", async () => {
    const radk = vi.fn().mockResolvedValue(report(253));
    const kanjidic = vi.fn().mockResolvedValue(report(13_108));
    await cachedSourceReport(SOURCE_KEYS.radkfile, radk);
    await cachedSourceReport(SOURCE_KEYS.kanjidic2, kanjidic);
    clearSourceReportCache(SOURCE_KEYS.radkfile);
    await cachedSourceReport(SOURCE_KEYS.radkfile, radk);
    await cachedSourceReport(SOURCE_KEYS.kanjidic2, kanjidic);
    expect(radk).toHaveBeenCalledTimes(2);
    expect(kanjidic).toHaveBeenCalledTimes(1);
  });
});

/**
 * The pages stay `force-dynamic` because three readers need a database and the
 * build has none, so the CDN is what actually spares the app a crawler's
 * sweep. If the header goes, the cache above only helps one instance.
 */
describe("the accreditation pages are given to the CDN", () => {
  const config = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");

  it("shares one render, and serves a stale one rather than missing", () => {
    expect(config).toMatch(/s-maxage=3600/);
    expect(config).toMatch(/stale-while-revalidate=86400/);
  });

  /* A shared cache, not a thousand private ones: a correction has to be able
     to reach everybody on the next revalidate. */
  it("caches in the shared layer and not in browsers", () => {
    const header = config.slice(config.indexOf("SOURCES_CACHE_HEADER"));
    expect(header).not.toMatch(/[^-]max-age=/);
  });

  it("covers the index and every source page", () => {
    expect(config).toMatch(/source: "\/sources"/);
    expect(config).toMatch(/source: "\/sources\/:source"/);
  });
});
