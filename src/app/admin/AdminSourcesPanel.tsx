"use client";

import { useState } from "react";
import useSWR from "swr";

import { SOURCE_CREDITS, sourcePath, type SourceKey } from "@/lib/sourceCredits";
import { describeFreshness, formatCount, type SourceReport } from "@/lib/sourceReport";
import { SOURCE_OPERATIONS, SOURCE_ORIGINS } from "@/lib/adminSources";
import { formatDateShort } from "@/lib/timeFormat";

import { ADMIN_SOURCES_COPY as copy } from "./AdminSources.constants";
import AdminPanelHeader from "./AdminPanelHeader";
import { useAdminFeedback } from "./AdminFeedbackProvider";

type SourcesPayload = { sources: SourceReport[]; failed: SourceKey[] };

/**
 * Every borrowed source in one place, and what to do about each.
 *
 * The public accreditation pages answer "what do we hold and when did it come
 * in" one source at a time, which is the reader's question. This is the other
 * one: across all twelve, is anything behind, and what is the remedy. The
 * remedy differs by where the data lives, so the row shows a button only where
 * a request can honour it and names the command everywhere else - the choice
 * `AdminContentSourcesPanel` already made for grades and maps, applied to the
 * whole set.
 */
export default function AdminSourcesPanel({
  sessionAuthorized,
  checkingSession,
}: {
  sessionAuthorized: boolean;
  checkingSession: boolean;
}) {
  const { showToast, confirmAction } = useAdminFeedback();
  const [running, setRunning] = useState<SourceKey | null>(null);

  const { data, error, isLoading, mutate } = useSWR<SourcesPayload>(
    sessionAuthorized && !checkingSession ? "/api/admin/sources" : null,
    async (url: string) => {
      const response = await fetch(url);
      const payload = (await response.json()) as SourcesPayload & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? copy.loadFailed);
      return payload;
    },
    { revalidateOnFocus: false, dedupingInterval: 30_000 },
  );

  async function refresh(key: SourceKey) {
    const endpoint = SOURCE_OPERATIONS[key].endpoint;
    if (!endpoint) return;
    const name = SOURCE_CREDITS[key].source;
    const scope = key in copy.scopes ? copy.scopes[key as keyof typeof copy.scopes] : "";

    const confirmed = await confirmAction({
      title: copy.confirm.title,
      description: copy.confirm.body(name, scope),
      confirmLabel: copy.confirm.accept,
    });
    if (!confirmed) return;

    setRunning(key);
    try {
      const response = await fetch(endpoint, { method: "POST" });
      if (!response.ok) throw new Error(copy.toast.failed(name));
      showToast(copy.toast.started(name));
      await mutate();
    } catch {
      showToast({ message: copy.toast.failed(name), tone: "error" });
    } finally {
      setRunning(null);
    }
  }

  if (checkingSession || isLoading) return <Shell><Note>{copy.loading}</Note></Shell>;
  if (!sessionAuthorized) return <Shell><Note>{copy.needsAuth}</Note></Shell>;
  if (error || !data) return <Shell><Note tone="bad">{copy.loadFailed}</Note></Shell>;

  const undated = data.sources.filter((report) => !report.lastImportedAt).length;
  const refreshable = data.sources.filter((report) => SOURCE_OPERATIONS[report.key].endpoint).length;

  return (
    <Shell>
      <div className="grid grid-cols-3 gap-2">
        <Stat label={copy.totals.sources} value={String(data.sources.length)} />
        <Stat label={copy.totals.refreshable} value={String(refreshable)} />
        <Stat label={copy.totals.stale} value={String(undated)} tone={undated > 0 ? "warn" : undefined} />
      </div>

      <ul className="mt-4 space-y-2">
        {data.sources.map((report) => (
          <SourceRow
            key={report.key}
            report={report}
            busy={running === report.key}
            onRefresh={() => refresh(report.key)}
          />
        ))}
        {data.failed.map((key) => (
          <li key={key} className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2">
            <p className="text-sm font-bold text-amber-800">
              {SOURCE_CREDITS[key].source} — {copy.unreadable}
            </p>
          </li>
        ))}
      </ul>
    </Shell>
  );
}

function SourceRow({
  report,
  busy,
  onRefresh,
}: {
  report: SourceReport;
  busy: boolean;
  onRefresh: () => void;
}) {
  const operation = SOURCE_OPERATIONS[report.key];
  const credit = SOURCE_CREDITS[report.key];

  return (
    <li className="rounded-xl border border-line bg-surface px-3 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <p className="text-sm font-black text-foreground">{credit.source}</p>
          <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-foreground/60">
            {operation.origin === SOURCE_ORIGINS.database ? copy.origin.database : copy.origin.file}
          </span>
        </div>
        <a
          href={sourcePath(report.key)}
          className="text-[11px] font-bold underline decoration-dotted underline-offset-2 text-foreground/70 hover:text-foreground"
        >
          {copy.viewPage}
        </a>
      </div>

      <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {report.counts.map((count) => (
          <div key={count.label} className="flex items-baseline gap-1.5">
            <dt className="text-[11px] font-semibold text-foreground/60">{count.label}</dt>
            <dd className="font-mono text-sm font-black tabular-nums text-foreground">{formatCount(count.value)}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <p className="text-[11px] font-semibold text-foreground/70">
          {copy.lastImported}:{" "}
          <span className="font-black text-foreground">
            {describeFreshness(report.lastImportedAt, report.generatedAtMs)}
          </span>
          {report.lastImportedAt ? (
            <span className="ml-1 font-mono text-foreground/60">{formatDateShort(report.lastImportedAt)}</span>
          ) : null}
          {report.version ? (
            <span className="ml-2">
              {copy.upstreamVersion}: <span className="font-mono font-black text-foreground">{report.version}</span>
            </span>
          ) : null}
        </p>

        {operation.endpoint ? (
          <button
            type="button"
            onClick={onRefresh}
            disabled={busy}
            className="inline-flex h-8 items-center rounded-full border border-accent bg-accent px-3 text-[11px] font-black uppercase tracking-[0.08em] text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {busy ? copy.refreshing : copy.refresh}
          </button>
        ) : (
          <code
            title={copy.commandHint}
            className="rounded-lg border border-line bg-surface-muted px-2 py-1 font-mono text-[11px] font-bold text-foreground/80"
          >
            {operation.command}
          </code>
        )}
      </div>
    </li>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface/90 p-5 shadow-sm">
      <AdminPanelHeader label={copy.label} title={copy.title} description={copy.description} />
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Note({ children, tone }: { children: React.ReactNode; tone?: "bad" }) {
  return <p className={`text-sm ${tone === "bad" ? "text-rose-600" : "text-foreground/70"}`}>{children}</p>;
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.08em] text-foreground/60">{label}</p>
      <p className={`text-lg font-black ${tone === "warn" ? "text-amber-600" : "text-foreground"}`}>{value}</p>
    </div>
  );
}
