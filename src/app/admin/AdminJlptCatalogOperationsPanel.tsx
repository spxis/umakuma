"use client";

import { formatDateTimeShort } from "@/lib/timeFormat";

import type { AdminControlRoomProps } from "./AdminControlRoom.types";
import AdminPanelHeader from "./AdminPanelHeader";
import AdminStatusBadge from "./AdminStatusBadge";

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
    signedIn,
    emailAllowed,
    jlptRefreshing,
    jlptEnriching,
    loading,
    operationScope,
    onRefreshJlptList,
    onEnrichJlptKanji,
  } = controlRoomProps;

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
    <section className="rounded-2xl border border-line bg-surface/90 p-5 shadow-sm">
      <AdminPanelHeader
        label="JLPT maintenance"
        title="Refresh and enrich"
        description="Run JLPT refresh/enrichment actions and review operation scope before each run."
        actions={
          <AdminStatusBadge
            checkingSession={checkingSession}
            sessionAuthorized={sessionAuthorized}
            signedIn={signedIn}
            emailAllowed={emailAllowed}
          />
        }
      />

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
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
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
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
          className="rounded-full border border-line bg-surface-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-foreground transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
        >
          {jlptEnriching ? "Enriching JLPT..." : "Enrich JLPT data"}
        </button>
      </div>

      <p className="mt-2 text-xs text-foreground/70">
        Scope guide: refresh may rewrite and prune stale rows (about {operationScope?.estimates.jlptRefreshMinutes ?? "-"} minute(s)).
        Enrichment updates missing fields in additive batches.
      </p>
      <p className="mt-1 text-xs text-foreground/60">
        Scope snapshot generated: {formatDateTimeShort(operationScope?.generatedAt ?? null)}
      </p>
    </section>
  );
}
