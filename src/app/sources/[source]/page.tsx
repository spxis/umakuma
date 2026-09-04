import type { Metadata } from "next";
import { notFound } from "next/navigation";

import PublicPageHeader from "@/app/shared/PublicPageHeader";
import UmaKumaPageBanner from "@/app/shared/UmaKumaPageBanner";
import { isSourceKey, SOURCE_CREDITS } from "@/lib/sourceCredits";
import { loadCachedSourceReport } from "@/lib/sourcePage";

import SourceReportPanel from "../SourceReportPanel";
import SourceTabs from "../SourceTabs";
import { SOURCES_COPY } from "../Sources.constants";

type Props = { params: Promise<{ source: string }> };

/*
 * Rendered on request, never at build time.
 *
 * Three of the twelve reports read the database. Listing the sources as static
 * params asked the build to prerender every page, and the build runs where
 * there is no database - so the release that added this page failed in CI
 * after passing a local build that happened to have one.
 *
 * The reports are cached for a few minutes instead, and the CDN is given the
 * rendered page, so a crawler sweeping all twelve costs one set of reads.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { source } = await params;
  if (!isSourceKey(source)) return { title: SOURCES_COPY.title };
  return {
    title: `${SOURCE_CREDITS[source].source} · ${SOURCES_COPY.title}`,
    description: `What UmaKuma holds from ${SOURCE_CREDITS[source].source}, and when it last came in.`,
  };
}

/**
 * One source's page: the place every credit on the site leads first.
 *
 * A credit used to link straight out to the vendor, which answered "who" and
 * nothing else. This answers what we hold from them, how much, when it was
 * last brought in and under what terms, with the way out at the top and the
 * other sources a tab away.
 */
export default async function SourcePage({ params }: Props) {
  const { source } = await params;
  if (!isSourceKey(source)) notFound();

  const report = await loadCachedSourceReport(source);

  return (
    <main className="mx-auto w-full max-w-3xl space-y-5 px-4 py-8 sm:px-6">
      <PublicPageHeader />
      <UmaKumaPageBanner variant="leaderboard" />
      <SourceTabs current={source} />
      <SourceReportPanel source={source} report={report} />
    </main>
  );
}
