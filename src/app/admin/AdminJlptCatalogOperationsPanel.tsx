"use client";

import { formatDateTimeShort } from "@/lib/timeFormat";

import type { AdminControlRoomProps } from "./AdminControlRoom.types";

type AdminJlptCatalogOperationsPanelProps = {
  sessionAuthorized: boolean;
  checkingSession: boolean;
  controlRoomProps: Omit<AdminControlRoomProps, "viewMode">;
};

export default function AdminJlptCatalogOperationsPanel({
  sessionAuthorized,
  checkingSession,
  controlRoomProps,
}: AdminJlptCatalogOperationsPanelProps) {
  const {
    jlptRefreshing,
    jlptEnriching,
    loading,
    operationScope,
    onRefreshJlptList,
    onEnrichJlptKanji,
  } = controlRoomProps;

  const runningState = jlptRefreshing ? "refreshing" : jlptEnriching ? "enriching" : "idle";
  const runningClassName =
    runningState === "idle"
      ? "border-line bg-surface-muted text-foreground/80"
      : "border-amber-200 bg-amber-50 text-amber-800";

  if (checkingSession) {
    return <p className="rounded-2xl border border-line bg-surface-muted p-4 text-sm font-semibold text-slate-700">Checking admin session...</p>;
  }

  if (!sessionAuthorized) {
    return (
      <p className="rounded-2xl border border-line bg-surface-muted p-4 text-sm font-semibold text-slate-700">
        JLPT tools are hidden. Sign in with an allowlisted Google account from Account operations.
      </p>
    );
  }

  return (
    <section className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl border border-line bg-surface p-4">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-foreground/60">JLPT rows</p>
          <p className="mt-1 text-2xl font-black text-foreground">{operationScope?.counts.jlptTotal ?? "-"}</p>
        </article>
        <article className="rounded-xl border border-line bg-surface p-4">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-foreground/60">Missing enrichment</p>
          <p className="mt-1 text-2xl font-black text-foreground">{operationScope?.counts.jlptMissingEnrichment ?? "-"}</p>
        </article>
        <article className="rounded-xl border border-line bg-surface p-4">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-foreground/60">Remaining batches</p>
          <p className="mt-1 text-2xl font-black text-foreground">{operationScope?.estimates.jlptEnrichRemainingBatches ?? "-"}</p>
          <p className="mt-1 text-xs text-foreground/65">Batch size {operationScope?.estimates.jlptEnrichBatchSize ?? "-"}</p>
        </article>

        <article className="rounded-xl border border-line bg-surface p-4">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-foreground/60">Sync state</p>
          <p className={`mt-1 inline-flex rounded-full border px-2 py-1 text-xs font-bold uppercase tracking-[0.08em] ${runningClassName}`}>
            {runningState}
          </p>
          <p className="mt-2 text-xs text-foreground/60">{runningState === "idle" ? "No active JLPT job" : "JLPT job in progress"}</p>
        </article>
      </div>

      <div className="rounded-xl border border-line bg-surface p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={loading || jlptRefreshing || jlptEnriching}
            onClick={onRefreshJlptList}
            className="rounded-full border border-line bg-surface-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-foreground transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
          >
            {jlptRefreshing ? "Refreshing JLPT..." : "Refresh JLPT list"}
          </button>
          <button
            type="button"
            disabled={loading || jlptRefreshing || jlptEnriching}
            onClick={onEnrichJlptKanji}
            className="rounded-full border border-accent bg-accent px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {jlptEnriching ? "Enriching JLPT..." : "Run JLPT enrichment"}
          </button>
        </div>

        <p className="mt-2 text-xs text-foreground/70">
          Scope guide: refresh may rewrite and prune stale rows (about {operationScope?.estimates.jlptRefreshMinutes ?? "-"} minute(s)). Enrichment updates missing fields in additive batches.
        </p>

        <div className="mt-3 grid gap-2 text-xs text-foreground/70 sm:grid-cols-2">
          <p>Missing enrichment rows: {operationScope?.counts.jlptMissingEnrichment ?? "-"}</p>
          <p>Batch size: {operationScope?.estimates.jlptEnrichBatchSize ?? "-"}</p>
          <p>Remaining batches: {operationScope?.estimates.jlptEnrichRemainingBatches ?? "-"}</p>
          <p>Scope snapshot: {formatDateTimeShort(operationScope?.generatedAt ?? null)}</p>
        </div>
      </div>
    </section>
  );
}
