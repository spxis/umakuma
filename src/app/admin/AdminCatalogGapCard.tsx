"use client";

import { useState } from "react";

import type { CatalogGapReport } from "@/lib/wanikani/catalogGapReport";
import { CATALOG_GAP_COPY } from "./AdminCatalog.constants";
import { useAdminFeedback } from "./AdminFeedbackProvider";
import SurfaceCard from "../shared/SurfaceCard";

/**
 * The hole in the catalogue, on request.
 *
 * The gap reopens every time WaniKani adds subjects and nothing on the site
 * says so - an interrupted sync left 98 subjects unreachable in August and it
 * took a script run to find out. This is that script's measurement, beside the
 * sync controls that cause and cure it.
 *
 * Behind a button rather than in the polled status because measuring reads
 * every account's assignment cache and every held row's relations. Status is
 * polled; this is asked.
 */

type AdminCatalogGapCardProps = {
  /** True while a sync holds the panel, so two heavy reads cannot overlap. */
  busy: boolean;
};

export default function AdminCatalogGapCard({ busy }: AdminCatalogGapCardProps) {
  const { showToast } = useAdminFeedback();
  const [report, setReport] = useState<CatalogGapReport | null>(null);
  const [measuring, setMeasuring] = useState(false);

  async function measure() {
    if (measuring || busy) {
      return;
    }

    setMeasuring(true);
    try {
      const response = await fetch("/api/admin/wk-catalog/gap", { cache: "no-store" });
      const data = (await response.json()) as CatalogGapReport & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? CATALOG_GAP_COPY.failed);
      }

      setReport(data);
      showToast({ tone: data.missingCount > 0 ? "info" : "success", message: CATALOG_GAP_COPY.toast(data) });
    } catch (error) {
      showToast({ tone: "error", message: error instanceof Error ? error.message : CATALOG_GAP_COPY.failed });
    } finally {
      setMeasuring(false);
    }
  }

  return (
    <SurfaceCard tone="plain" padding="md">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-foreground/60">{CATALOG_GAP_COPY.title}</p>
        <button
          type="button"
          onClick={() => {
            void measure();
          }}
          disabled={measuring || busy}
          className="rounded-full border border-line bg-surface-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-foreground transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
        >
          {measuring ? CATALOG_GAP_COPY.measuring : CATALOG_GAP_COPY.measure}
        </button>
      </div>

      {measuring ? <p className="mt-2 text-sm text-foreground/70">{CATALOG_GAP_COPY.working}</p> : null}

      {!measuring && !report ? <p className="mt-2 text-sm text-foreground/70">{CATALOG_GAP_COPY.blurb}</p> : null}

      {!measuring && report ? (
        <div className="mt-2 space-y-2">
          <p className="text-sm font-semibold text-foreground/80">{CATALOG_GAP_COPY.headline(report)}</p>
          <p className="text-xs text-foreground/60">{CATALOG_GAP_COPY.held(report)}</p>

          {report.missingCount > 0 ? (
            <>
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-foreground/60">
                {CATALOG_GAP_COPY.idsHeading(report)}
              </p>
              <p className="max-h-32 overflow-y-auto rounded-lg border border-line bg-surface-muted px-3 py-2 font-mono text-xs leading-relaxed text-foreground/80">
                {report.missing.join(", ")}
              </p>
              <p className="text-xs text-foreground/60">
                Fetch them with <span className="font-mono">{CATALOG_GAP_COPY.backfill}</span>
                {CATALOG_GAP_COPY.backfillHint}
              </p>
            </>
          ) : null}
        </div>
      ) : null}
    </SurfaceCard>
  );
}
