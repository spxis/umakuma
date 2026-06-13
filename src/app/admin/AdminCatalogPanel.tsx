"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useAdminFeedback } from "./AdminFeedbackProvider";

type CatalogStatusResponse = {
  now: string;
  counts: {
    totalSubjects: number;
    levels: number;
    byType: {
      radical: number;
      kanji: number;
      vocabulary: number;
    };
  };
  expected: {
    levels: number;
  };
  drift: {
    missingLevels: number[];
    extraLevels: number[];
    duplicateSubjectRows: number;
  };
  state: {
    isSyncing: boolean;
    lastStatus: string;
    lastError: string | null;
    lastFullSyncCompletedAt: string | null;
    lastIncrementalSyncCompletedAt: string | null;
    lastCursorDataUpdatedAt: string | null;
    lastCursorSubjectId: number | null;
    updatedAt: string;
  };
  latestRuns: Array<{
    id: string;
    runType: string;
    status: string;
    startedAt: string;
    completedAt: string | null;
    durationMs: number | null;
    fetchedCount: number;
    upsertedCount: number;
    changedCount: number;
    errorCount: number;
    errorMessage: string | null;
  }>;
};

type ManualSyncResponse = {
  ok: boolean;
  mode: "dry-run" | "apply";
  runType: "full" | "incremental";
  summary: {
    pagesProcessed: number;
    fetchedCount: number;
    upsertedCount: number;
    changedCount: number;
    skippedCount: number;
    parseErrorCount: number;
  };
  state?: {
    status: string;
    isSyncing: boolean;
    lastError: string | null;
  };
};

type AdminCatalogPanelProps = {
  sessionAuthorized: boolean;
  checkingSession: boolean;
};

function formatDateTime(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
}

function statusTone(status: string): "ok" | "warn" | "error" | "idle" {
  if (status === "ok") {
    return "ok";
  }

  if (status === "error") {
    return "error";
  }

  if (status === "running") {
    return "warn";
  }

  return "idle";
}

function statusClassName(status: string): string {
  const tone = statusTone(status);
  if (tone === "ok") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (tone === "error") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (tone === "warn") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-line bg-surface-muted text-foreground/80";
}

export default function AdminCatalogPanel({ sessionAuthorized, checkingSession }: AdminCatalogPanelProps) {
  const { showToast, confirmAction } = useAdminFeedback();
  const [status, setStatus] = useState<CatalogStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const canRunSync = sessionAuthorized && !checkingSession && !syncing;

  const loadStatus = useCallback(async () => {
    if (!sessionAuthorized || checkingSession) {
      setStatus(null);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/admin/wk-catalog/status", { cache: "no-store" });
      const data = (await response.json()) as CatalogStatusResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not load catalog status.");
      }

      setStatus(data);
    } catch (error) {
      showToast({ tone: "error", message: error instanceof Error ? error.message : "Could not load catalog status." });
    } finally {
      setLoading(false);
    }
  }, [checkingSession, sessionAuthorized, showToast]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const driftSummary = useMemo(() => {
    if (!status) {
      return "-";
    }

    const missing = status.drift.missingLevels.length;
    const extra = status.drift.extraLevels.length;
    const duplicates = status.drift.duplicateSubjectRows;

    if (missing === 0 && extra === 0 && duplicates === 0) {
      return "No drift detected.";
    }

    return `Missing levels: ${missing}, extra levels: ${extra}, duplicate rows: ${duplicates}.`;
  }, [status]);

  async function triggerSync(runType: "full" | "incremental", mode: "dry-run" | "apply") {
    if (!canRunSync) {
      return;
    }

    if (mode === "apply") {
      const accepted = await confirmAction({
        title: runType === "full" ? "Run full catalog sync" : "Run incremental catalog sync",
        description:
          runType === "full"
            ? "This may take a while and writes catalog rows. Continue?"
            : "This writes catalog updates from recent changes. Continue?",
        confirmLabel: "Run sync",
        cancelLabel: "Cancel",
        tone: "danger",
      });

      if (!accepted) {
        return;
      }
    }

    setSyncing(true);
    try {
      const response = await fetch("/api/admin/wk-catalog/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ runType, mode }),
      });

      const data = (await response.json()) as ManualSyncResponse & { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Catalog sync failed.");
      }

      const summary = data.summary;
      showToast({
        tone: "success",
        message: `Catalog ${runType} ${mode} done. pages=${summary.pagesProcessed}, fetched=${summary.fetchedCount}, changed=${summary.changedCount}.`,
      });

      await loadStatus();
    } catch (error) {
      showToast({ tone: "error", message: error instanceof Error ? error.message : "Catalog sync failed." });
    } finally {
      setSyncing(false);
    }
  }

  if (checkingSession) {
    return <p className="rounded-2xl border border-line bg-surface-muted p-4 text-sm font-semibold text-slate-700">Checking admin session...</p>;
  }

  if (!sessionAuthorized) {
    return (
      <p className="rounded-2xl border border-line bg-surface-muted p-4 text-sm font-semibold text-slate-700">
        Catalog tools are hidden. Sign in with an allowlisted Google account.
      </p>
    );
  }

  return (
    <section className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl border border-line bg-surface p-4">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-foreground/60">Subjects</p>
          <p className="mt-1 text-2xl font-black text-foreground">{status?.counts.totalSubjects ?? "-"}</p>
          <p className="mt-1 text-xs text-foreground/60">
            Levels: {status?.counts.levels ?? "-"} / {status?.expected.levels ?? "-"}
          </p>
        </article>

        <article className="rounded-xl border border-line bg-surface p-4">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-foreground/60">By type</p>
          <p className="mt-1 text-sm font-semibold text-foreground/80">
            Radical {status?.counts.byType.radical ?? 0}, Kanji {status?.counts.byType.kanji ?? 0}, Vocabulary {status?.counts.byType.vocabulary ?? 0}
          </p>
        </article>

        <article className="rounded-xl border border-line bg-surface p-4">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-foreground/60">Sync state</p>
          <p className={`mt-1 inline-flex rounded-full border px-2 py-1 text-xs font-bold uppercase tracking-[0.08em] ${statusClassName(status?.state.lastStatus ?? "idle")}`}>
            {status?.state.lastStatus ?? "idle"}
          </p>
          <p className="mt-2 text-xs text-foreground/60">{status?.state.isSyncing ? "Sync lock active" : "No sync lock"}</p>
        </article>

        <article className="rounded-xl border border-line bg-surface p-4">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-foreground/60">Drift</p>
          <p className="mt-1 text-sm font-semibold text-foreground/80">{driftSummary}</p>
        </article>
      </div>

      <div className="rounded-xl border border-line bg-surface p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              void triggerSync("incremental", "dry-run");
            }}
            disabled={!canRunSync}
            className="rounded-full border border-line bg-surface-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-foreground transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
          >
            Incremental dry run
          </button>
          <button
            type="button"
            onClick={() => {
              void triggerSync("incremental", "apply");
            }}
            disabled={!canRunSync}
            className="rounded-full border border-accent bg-accent px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Run incremental sync
          </button>
          <button
            type="button"
            onClick={() => {
              void triggerSync("full", "dry-run");
            }}
            disabled={!canRunSync}
            className="rounded-full border border-line bg-surface-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-foreground transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
          >
            Full dry run
          </button>
          <button
            type="button"
            onClick={() => {
              void triggerSync("full", "apply");
            }}
            disabled={!canRunSync}
            className="rounded-full border border-red-300 bg-red-50 px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-red-800 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Run full sync
          </button>
          <button
            type="button"
            onClick={() => {
              void loadStatus();
            }}
            disabled={loading || syncing}
            className="rounded-full border border-line bg-surface-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-foreground transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
          >
            Refresh status
          </button>
        </div>

        <div className="mt-3 grid gap-2 text-xs text-foreground/70 sm:grid-cols-2">
          <p>Last full sync: {formatDateTime(status?.state.lastFullSyncCompletedAt ?? null)}</p>
          <p>Last incremental sync: {formatDateTime(status?.state.lastIncrementalSyncCompletedAt ?? null)}</p>
          <p>Cursor updated at: {formatDateTime(status?.state.lastCursorDataUpdatedAt ?? null)}</p>
          <p>Cursor subject id: {status?.state.lastCursorSubjectId ?? "-"}</p>
          <p>Status updated: {formatDateTime(status?.state.updatedAt ?? null)}</p>
          <p>Server now: {formatDateTime(status?.now ?? null)}</p>
        </div>

        {status?.state.lastError ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">Last error: {status.state.lastError}</p>
        ) : null}
      </div>

      <div className="rounded-xl border border-line bg-surface p-4">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-foreground/60">Recent runs</p>
        {status?.latestRuns.length ? (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-xs text-foreground/80">
              <thead>
                <tr className="border-b border-line text-foreground/60">
                  <th className="px-2 py-2 font-bold">Type</th>
                  <th className="px-2 py-2 font-bold">Status</th>
                  <th className="px-2 py-2 font-bold">Started</th>
                  <th className="px-2 py-2 font-bold">Duration</th>
                  <th className="px-2 py-2 font-bold">Fetched</th>
                  <th className="px-2 py-2 font-bold">Changed</th>
                  <th className="px-2 py-2 font-bold">Errors</th>
                </tr>
              </thead>
              <tbody>
                {status.latestRuns.map((run) => (
                  <tr key={run.id} className="border-b border-line/60">
                    <td className="px-2 py-2 font-semibold uppercase tracking-[0.06em]">{run.runType}</td>
                    <td className="px-2 py-2">
                      <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.06em] ${statusClassName(run.status)}`}>
                        {run.status}
                      </span>
                    </td>
                    <td className="px-2 py-2">{formatDateTime(run.startedAt)}</td>
                    <td className="px-2 py-2">{run.durationMs ?? "-"}</td>
                    <td className="px-2 py-2">{run.fetchedCount}</td>
                    <td className="px-2 py-2">{run.changedCount}</td>
                    <td className="px-2 py-2">{run.errorCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-2 text-sm text-foreground/70">No sync runs yet.</p>
        )}
      </div>
    </section>
  );
}