import type { Metadata } from "next";
import Link from "next/link";

import PublicPageHeader from "@/app/shared/PublicPageHeader";
import UmaKumaPageBanner from "@/app/shared/UmaKumaPageBanner";
import { SOURCE_CREDITS, SOURCE_KEY_VALUES, sourcePath } from "@/lib/sourceCredits";
import { loadCachedSourceReport } from "@/lib/sourcePage";
import { describeFreshness, formatCount, type SourceReport } from "@/lib/sourceReport";

import SourceTabs from "./SourceTabs";
import { SOURCE_DESCRIPTIONS, SOURCES_COPY } from "./Sources.constants";

/* Reads the database; see the source page for why this is never prerendered. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: SOURCES_COPY.title,
  description: SOURCES_COPY.subtitle,
};

/**
 * All the sources at once, each with its headline number and its freshness.
 *
 * The overview a reader lands on from the footer; a credit lands them on one
 * source's own page instead. Both carry the same tab row, so either is a way
 * to the rest.
 */
export default async function SourcesPage() {
  /*
   * Settled, not all. Each reader answers for its own source, but one of them
   * rejecting used to take the whole index down with it - a table missing on
   * an environment would hide eleven healthy sources to report the twelfth.
   * A source that cannot answer simply loses its card.
   */
  const settled = await Promise.allSettled(SOURCE_KEY_VALUES.map((key) => loadCachedSourceReport(key)));
  const reports = settled
    .filter((result): result is PromiseFulfilledResult<SourceReport> => result.status === "fulfilled")
    .map((result) => result.value);

  return (
    <main className="mx-auto w-full max-w-3xl space-y-5 px-4 py-8 sm:px-6">
      <PublicPageHeader />
      <UmaKumaPageBanner variant="leaderboard" />

      <header className="space-y-1">
        <h1 className="text-2xl font-black text-foreground">{SOURCES_COPY.title}</h1>
        <p className="text-sm font-semibold text-foreground/70">{SOURCES_COPY.intro}</p>
      </header>

      <SourceTabs current={null} />

      <ul className="grid gap-4 sm:grid-cols-2">
        {reports.map((report) => {
          const credit = SOURCE_CREDITS[report.key];
          const headline = report.counts[0];
          return (
            <li key={report.key}>
              <Link
                href={sourcePath(report.key)}
                className="flex h-full flex-col gap-2 rounded-3xl border border-line bg-surface p-5 transition hover:bg-surface-muted"
              >
                <span className="text-lg font-black text-foreground">{credit.source}</span>
                <span className="text-sm font-semibold leading-relaxed text-foreground/70">
                  {SOURCE_DESCRIPTIONS[report.key].lede}
                </span>
                <span className="mt-auto flex items-baseline justify-between gap-3 border-t border-line pt-2 text-xs font-semibold text-foreground/60">
                  {headline ? (
                    <span>
                      <span className="font-mono text-base font-black tabular-nums text-foreground">{formatCount(headline.value)}</span>{" "}
                      {headline.label.toLowerCase()}
                    </span>
                  ) : null}
                  <span>{SOURCES_COPY.lastImported.toLowerCase()} {describeFreshness(report.lastImportedAt, report.generatedAtMs)}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
