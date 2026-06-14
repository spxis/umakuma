"use client";

import { useEffect, useRef, useState } from "react";

import { formatDateTimeShort } from "@/lib/timeFormat";

import type { AdminControlRoomProps } from "./AdminControlRoom.types";

type AdminJlptCatalogOperationsPanelProps = {
  sessionAuthorized: boolean;
  checkingSession: boolean;
  controlRoomProps: Omit<AdminControlRoomProps, "viewMode">;
};

type JlptRecentRunItem = {
  id: string;
  runType: "refresh" | "enrich";
  status: "ok";
  startedAt: string;
  durationMs: number;
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

  const [recentRuns, setRecentRuns] = useState<JlptRecentRunItem[]>([]);
  const refreshStartedAtRef = useRef<number | null>(null);
  const enrichStartedAtRef = useRef<number | null>(null);

  const runningState = jlptRefreshing ? "refreshing" : jlptEnriching ? "enriching" : "idle";
  const runningClassName =
    runningState === "idle"
      ? "border-line bg-surface-muted text-foreground/80"
      : "border-amber-200 bg-amber-50 text-amber-800";

  function runStatusClassName(status: "ok" | "error") {
    return status === "ok"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-red-200 bg-red-50 text-red-800";
  }

  useEffect(() => {
    if (jlptRefreshing) {
      refreshStartedAtRef.current = Date.now();
      return;
    }

    if (refreshStartedAtRef.current == null) {
      return;
    }

    const startedAt = refreshStartedAtRef.current;
    refreshStartedAtRef.current = null;
    const nextRun: JlptRecentRunItem = {
      id: crypto.randomUUID(),
      runType: "refresh",
      status: "ok",
      startedAt: new Date(startedAt).toISOString(),
      durationMs: Date.now() - startedAt,
    };
    setRecentRuns((previous) => [
      nextRun,
      ...previous,
    ].slice(0, 10));
  }, [jlptRefreshing]);

  useEffect(() => {
    if (jlptEnriching) {
      enrichStartedAtRef.current = Date.now();
      return;
    }

    if (enrichStartedAtRef.current == null) {
      return;
    }

    const startedAt = enrichStartedAtRef.current;
    enrichStartedAtRef.current = null;
    const nextRun: JlptRecentRunItem = {
      id: crypto.randomUUID(),
      runType: "enrich",
      status: "ok",
      startedAt: new Date(startedAt).toISOString(),
      durationMs: Date.now() - startedAt,
    };
    setRecentRuns((previous) => [
      nextRun,
      ...previous,
    ].slice(0, 10));
  }, [jlptEnriching]);

  if (checkingSession) {
    return <p className="rounded-2xl border border-line bg-surface-muted p-4 text-sm font-semibold text-slate-700">Checking admin session...</p>;
  }

  if (!sessionAuthorized) {
    return (
      <p className="rounded-2xl border border-line bg-surface-muted p-4 text-sm font-semibold text-slate-700">
        JLPT tools are hidden. Sign in with an allowlisted Google account from Accounts.
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
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-foreground/60">Sync state</p>
          <p className={`mt-1 inline-flex rounded-full border px-2 py-1 text-xs font-bold uppercase tracking-[0.08em] ${runningClassName}`}>
            {runningState}
          </p>
          <p className="mt-2 text-xs text-foreground/60">{runningState === "idle" ? "No active JLPT job" : "JLPT job in progress"}</p>
        </article>

        <article className="rounded-xl border border-line bg-surface p-4">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-foreground/60">Remaining batches</p>
          <p className="mt-1 text-2xl font-black text-foreground">{operationScope?.estimates.jlptEnrichRemainingBatches ?? "-"}</p>
          <p className="mt-1 text-xs text-foreground/65">Batch size {operationScope?.estimates.jlptEnrichBatchSize ?? "-"}</p>
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

      <div className="rounded-xl border border-line bg-surface p-4">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-foreground/60">Recent runs</p>
        {recentRuns.length ? (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-xs text-foreground/80">
              <thead>
                <tr className="border-b border-line text-foreground/60">
                  <th className="px-2 py-2 font-bold">Type</th>
                  <th className="px-2 py-2 font-bold">Status</th>
                  <th className="px-2 py-2 font-bold">Started</th>
                  <th className="px-2 py-2 font-bold">Duration</th>
                </tr>
              </thead>
              <tbody>
                {recentRuns.map((run) => (
                  <tr key={run.id} className="border-b border-line/60">
                    <td className="px-2 py-2 font-semibold uppercase tracking-[0.06em]">{run.runType}</td>
                    <td className="px-2 py-2">
                      <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.06em] ${runStatusClassName(run.status)}`}>
                        {run.status}
                      </span>
                    </td>
                    <td className="px-2 py-2">{formatDateTimeShort(run.startedAt)}</td>
                    <td className="px-2 py-2">{run.durationMs ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-2 text-sm text-foreground/70">No JLPT runs yet.</p>
        )}
      </div>
    </section>
  );
}
