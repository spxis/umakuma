"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { formatRelativeFromNow } from "@/lib/timeFormat";
import { isSubjectType } from "@/lib/domainConstants";
import HistoryItemDetailModal from "@/app/shared/HistoryItemDetailModal";
import StudyHistoryFilters from "@/app/shared/StudyHistoryFilters";
import type { HistorySrsBucket, StudyHistoryPayload } from "@/app/shared/studyHistoryTypes";
import { pronunciationForReading } from "@/app/users/[nickname]/level-explorer/lib/levelExplorerDisplay";
import { usePersistedBoolean } from "@/lib/usePersistedBoolean";
import StudyHistoryHeader from "@/app/shared/StudyHistoryHeader";
import StudyHistoryAttemptMetaChips from "@/app/shared/StudyHistoryAttemptMetaChips";
import GlyphReferenceTile from "@/app/users/[nickname]/shared/GlyphReferenceTile";

type SortBy = "submittedAt" | "result" | "subjectType" | "subject" | "user";
type SortDir = "asc" | "desc";
type Props = {
  endpoint: string;
  showUserColumn?: boolean;
  heading?: string;
  collapsible?: boolean;
  persistenceKey?: string;
};
const EMPTY_RESULT_COUNTS = { all: 0, correct: 0, wrong: 0, skipped: 0 };
const EMPTY_SRS_BUCKET_COUNTS = { apprentice: 0, guru: 0, master: 0, enlightened: 0, burned: 0, locked: 0, unknown: 0 };

function sortIcon(activeSortBy: SortBy, sortBy: SortBy, sortDir: SortDir): string {
  return activeSortBy === sortBy ? (sortDir === "desc" ? "v" : "^") : "<>";
}
function formatHistoryDateCompact(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return "-";
  }
  const monthDay = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
  }).format(date);
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date).toLowerCase();
  return `${monthDay.toUpperCase()} (${time})`;
}
function resultIcon(result: string): { icon: string; className: string; label: string } {
  if (result === "correct") {
    return { icon: "✓", className: "text-emerald-600", label: "Correct" };
  }
  if (result === "wrong") {
    return { icon: "✕", className: "text-red-600", label: "Wrong" };
  }
  return { icon: "•", className: "text-amber-600", label: "Skipped" };
}

export default function StudyHistoryTable({
  endpoint,
  showUserColumn = false,
  heading = "Study Submission History",
  collapsible = true,
  persistenceKey,
}: Props) {
  const storageKey = persistenceKey ?? `wr:study-history:open:${endpoint}`;
  const [expanded, setExpanded] = useState(() => {
    if (!collapsible || typeof window === "undefined") {
      return true;
    }

    try {
      return window.localStorage.getItem(storageKey) !== "0";
    } catch {
      return true;
    }
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState<SortBy>("submittedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [resultFilter, setResultFilter] = useState<"all" | "correct" | "wrong" | "skipped">("all");
  const [levelFilter, setLevelFilter] = useState<number | "all">("all");
  const [srsBucketFilter, setSrsBucketFilter] = useState<HistorySrsBucket | "all">("all");
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = usePersistedBoolean(`wr:study-history:filters-open:${endpoint}`, { defaultValue: true });

  const query = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      sortBy,
      sortDir,
    });

    if (resultFilter !== "all") {
      params.set("result", resultFilter);
    }
    if (levelFilter !== "all") {
      params.set("level", String(levelFilter));
    }
    if (srsBucketFilter !== "all") {
      params.set("srsBucket", srsBucketFilter);
    }

    const glue = endpoint.includes("?") ? "&" : "?";
    return `${endpoint}${glue}${params.toString()}`;
  }, [endpoint, levelFilter, page, pageSize, resultFilter, sortBy, sortDir, srsBucketFilter]);

  const { data, error, isLoading } = useSWR<StudyHistoryPayload>(
    expanded ? query : null,
    async (url: string) => {
      const response = await fetch(url, { cache: "no-store" });
      const payload = (await response.json()) as StudyHistoryPayload;
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not load study history.");
      }
      return payload;
    },
    { revalidateOnFocus: true },
  );

  const totals = data?.totals ?? {};
  const totalAttempts = Object.values(totals).reduce((sum, value) => sum + value, 0);
  const resultCounts = data?.resultCounts ?? EMPTY_RESULT_COUNTS;
  const srsBucketCounts = data?.srsBucketCounts ?? EMPTY_SRS_BUCKET_COUNTS;
  const selectedAttemptIdForModal = selectedAttemptId && data?.attempts.some((row) => row.id === selectedAttemptId)
    ? selectedAttemptId
    : null;

  useEffect(() => {
    if (!collapsible || typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(storageKey, expanded ? "1" : "0");
    } catch {
      // Ignore persistence failures.
    }
  }, [collapsible, expanded, storageKey]);

  function toggleSort(nextSortBy: SortBy) {
    setPage(1);
    if (sortBy !== nextSortBy) {
      setSortBy(nextSortBy);
      setSortDir(nextSortBy === "submittedAt" ? "desc" : "asc");
      return;
    }
    setSortDir((prev) => (prev === "desc" ? "asc" : "desc"));
  }

  function handleSetResultFilter(value: "all" | "correct" | "wrong" | "skipped") {
    setPage(1);
    setResultFilter(value);
  }
  function handleSetLevelFilter(value: number | "all") {
    setPage(1);
    setLevelFilter(value);
  }
  function handleSetSrsBucketFilter(value: HistorySrsBucket | "all") {
    setPage(1);
    setSrsBucketFilter(value);
  }
  return (
    <section className="rounded-2xl border border-line bg-surface/90 p-4 shadow-sm sm:p-5">
      <StudyHistoryHeader
        heading={heading}
        collapsible={collapsible}
        expanded={expanded}
        onToggleExpanded={() => setExpanded((value) => !value)}
        filtersOpen={filtersOpen}
        onToggleFilters={() => setFiltersOpen((value) => !value)}
      />
      {!expanded ? null : (
        <>
          <div className="mt-3">
            {filtersOpen ? (
            <StudyHistoryFilters
              resultFilter={resultFilter}
              setResultFilter={handleSetResultFilter}
              resultCounts={resultCounts}
              levelFilter={levelFilter}
              setLevelFilter={handleSetLevelFilter}
              availableLevels={data?.availableLevels ?? []}
              levelAllCount={data?.levelAllCount ?? 0}
              levelCounts={data?.levelCounts ?? {}}
              srsBucketFilter={srsBucketFilter}
              setSrsBucketFilter={handleSetSrsBucketFilter}
              availableSrsBuckets={data?.availableSrsBuckets ?? []}
              srsBucketAllCount={data?.srsBucketAllCount ?? 0}
              srsBucketCounts={srsBucketCounts}
            />
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm sm:text-base">
            <span>Total: <strong>{totalAttempts}</strong></span>
            <span>Correct: <strong className="text-emerald-600">{totals.correct ?? 0}</strong></span>
            <span>Wrong: <strong className="text-red-500">{totals.wrong ?? 0}</strong></span>
            {(totals.skipped ?? 0) > 0 ? <span>Skipped: <strong className="text-amber-500">{totals.skipped}</strong></span> : null}
            {showUserColumn ? <span>Accounts: <strong>{data?.accountCount ?? 0}</strong></span> : null}
          </div>
          {isLoading ? <p className="mt-4 text-base text-foreground/70">Loading...</p> : null}
          {error ? <p className="mt-4 text-base text-red-600">{error.message}</p> : null}
          {data ? (
        <div className="mt-3 space-y-3">
          <div className="sm:hidden overflow-hidden rounded-lg border border-line bg-surface">
            <div className="grid grid-cols-[52%_48%] bg-surface-muted px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-foreground/65">
              <p>Time</p>
              <p>Subject</p>
            </div>
            <div className="divide-y divide-line/50">
              {data.attempts.map((row) => (
                <div key={`mobile-${row.id}`} className="relative grid grid-cols-[52%_48%] gap-0 bg-surface px-2 py-1.5 hover:bg-surface-muted/40">
                  {(() => {
                    const meta = resultIcon(row.result);
                    return (
                      <>
                        <span
                          className={`absolute right-2 top-1/2 -translate-y-1/2 text-base font-black leading-none ${meta.className}`}
                          title={meta.label}
                          aria-hidden
                        >
                          {meta.icon}
                        </span>
                        <span className="sr-only">{meta.label}</span>
                      </>
                    );
                  })()}

                  <div className="min-w-0">
                    <p className="pr-5 text-[10px] font-bold uppercase tracking-[0.05em] text-foreground/70 leading-tight whitespace-nowrap">
                      {formatHistoryDateCompact(row.submittedAt)} · {formatRelativeFromNow(row.submittedAt, { style: "short", allowFuture: false, noValueLabel: "-", invalidLabel: "-" })}
                    </p>
                    <StudyHistoryAttemptMetaChips
                      subjectType={row.subjectType}
                      wkLevel={typeof row.wkLevel === "number" ? row.wkLevel : null}
                      srsStage={typeof row.srsStage === "number" ? row.srsStage : null}
                      srsBucket={row.srsBucket}
                      compact
                      className="mt-0.5 flex flex-nowrap items-center gap-0.5 overflow-hidden whitespace-nowrap pr-5"
                    />
                    {showUserColumn ? (
                      <p className="mt-0.5 truncate pr-5 text-[10px] font-bold uppercase tracking-[0.06em] text-foreground/60 leading-tight">{row.nickname}</p>
                    ) : null}
                  </div>

                  <div className="min-w-0 pr-5">
                    <div className="flex items-center gap-2 leading-tight">
                      <GlyphReferenceTile
                        glyph={row.subjectLabel}
                        subtitle={historySubjectSubtitle(row.subjectReading, row.subjectMeaning)}
                        subjectType={historySubjectType(row.subjectType)}
                        wkLevel={row.wkLevel}
                        size="large"
                        onClick={() => {
                          setSelectedAttemptId(row.id);
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden max-h-168 overflow-auto rounded-lg border border-line sm:block">
            <table className="w-full text-left text-sm sm:text-base">
            <thead className="sticky top-0 z-20 bg-surface-muted text-xs uppercase tracking-wider text-muted sm:text-sm">
              <tr>
                <th className="w-[30%] px-3 py-2">
                  <button type="button" onClick={() => toggleSort("submittedAt")} className="font-bold">Time {sortIcon(sortBy, "submittedAt", sortDir)}</button>
                </th>
                {showUserColumn ? (
                  <th className="w-[14%] px-3 py-2">
                    <button type="button" onClick={() => toggleSort("user")} className="font-bold">User {sortIcon(sortBy, "user", sortDir)}</button>
                  </th>
                ) : null}
                <th className="px-3 py-2">
                  <button type="button" onClick={() => toggleSort("subject")} className="font-bold">Subject {sortIcon(sortBy, "subject", sortDir)}</button>
                </th>
                <th className="w-[8%] px-3 py-2 text-center">
                  <button type="button" onClick={() => toggleSort("result")} className="font-bold">Result {sortIcon(sortBy, "result", sortDir)}</button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/50">
              {data.attempts.map((row) => (
                <tr key={row.id} className="hover:bg-surface-muted/40">
                  <td className="px-3 py-2 align-top">
                    <p className="font-semibold text-foreground/85">{formatHistoryDateCompact(row.submittedAt)}</p>
                    <p className="text-[11px] uppercase tracking-[0.08em] text-foreground/55">
                      {formatRelativeFromNow(row.submittedAt, { style: "short", allowFuture: false, noValueLabel: "-", invalidLabel: "-" })}
                    </p>
                    <StudyHistoryAttemptMetaChips
                      subjectType={row.subjectType}
                      wkLevel={typeof row.wkLevel === "number" ? row.wkLevel : null}
                      srsStage={typeof row.srsStage === "number" ? row.srsStage : null}
                      srsBucket={row.srsBucket}
                    />
                  </td>
                  {showUserColumn ? <td className="px-3 py-2 align-top">{row.nickname}</td> : null}
                  <td className="px-3 py-2 align-top">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 leading-tight">
                        <GlyphReferenceTile
                          glyph={row.subjectLabel}
                          subtitle={historySubjectSubtitle(row.subjectReading, row.subjectMeaning)}
                          subjectType={historySubjectType(row.subjectType)}
                          wkLevel={row.wkLevel}
                          size="large"
                          onClick={() => {
                            setSelectedAttemptId(row.id);
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 align-middle text-center">
                    {(() => {
                      const meta = resultIcon(row.result);
                      return (
                        <>
                          <span className={`text-2xl font-black leading-none ${meta.className}`} title={meta.label} aria-hidden>
                            {meta.icon}
                          </span>
                          <span className="sr-only">{meta.label}</span>
                        </>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {data ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="font-semibold text-foreground/70">
            Page {data.pagination.page} of {data.pagination.totalPages} · {data.pagination.total} rows
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/65">Page size</label>
            <select
              value={pageSize}
              onChange={(event) => {
                setPage(1);
                setPageSize(Number(event.target.value));
              }}
              className="h-9 rounded-full border border-line bg-surface px-3 text-sm font-bold shadow-sm"
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <button
              type="button"
              disabled={!data.pagination.hasPrevious}
              onClick={() => setPage(1)}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-bold uppercase tracking-[0.08em] disabled:cursor-not-allowed disabled:opacity-50"
            >
              First
            </button>
            <button
              type="button"
              disabled={!data.pagination.hasPrevious}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="rounded-full border border-line bg-surface px-4 py-1.5 text-sm font-bold uppercase tracking-[0.08em] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={!data.pagination.hasNext}
              onClick={() => setPage((prev) => prev + 1)}
              className="rounded-full border border-line bg-surface px-4 py-1.5 text-sm font-bold uppercase tracking-[0.08em] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
            <button
              type="button"
              disabled={!data.pagination.hasNext}
              onClick={() => setPage(data.pagination.totalPages)}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-bold uppercase tracking-[0.08em] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Last
            </button>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                const parsed = Number(formData.get("page"));
                if (!Number.isFinite(parsed)) {
                  return;
                }

                const nextPage = Math.min(data.pagination.totalPages, Math.max(1, Math.trunc(parsed)));
                if (nextPage !== data.pagination.page) {
                  setPage(nextPage);
                }
              }}
              className="flex items-center gap-1"
            >
              <input
                key={data.pagination.page}
                name="page"
                type="number"
                min={1}
                max={data.pagination.totalPages}
                defaultValue={String(data.pagination.page)}
                className="h-9 w-16 rounded-md border border-line bg-surface px-2 text-sm"
                aria-label="Page number"
              />
              <button
                type="submit"
                className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-bold uppercase tracking-[0.08em]"
              >
                Go
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {data ? (
        <HistoryItemDetailModal
          attempts={data.attempts}
          selectedAttemptId={selectedAttemptIdForModal}
          onSelectAttemptId={setSelectedAttemptId}
          onClose={() => {
            setSelectedAttemptId(null);
          }}
        />
      ) : null}
        </>
      )}
    </section>
  );
}

function historySubjectType(type: string) {
  return isSubjectType(type) ? type : undefined;
}

function historySubjectSubtitle(reading: string | null, meaning: string | null): string {
  const normalizedReading = reading?.trim();
  if (normalizedReading) {
    const pronunciation = pronunciationForReading(normalizedReading);
    return pronunciation ? `${normalizedReading} / ${pronunciation}` : normalizedReading;
  }

  return meaning?.trim() || "-";
}
