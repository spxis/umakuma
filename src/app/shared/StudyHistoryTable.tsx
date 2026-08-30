"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import HistoryItemDetailModal from "@/app/shared/HistoryItemDetailModal";
import StudyHistoryFilters from "@/app/shared/StudyHistoryFilters";
import type { HistorySrsBucket, StudyHistoryPayload } from "@/app/shared/studyHistoryTypes";
import { usePersistedBoolean } from "@/lib/usePersistedBoolean";
import StudyHistoryHeader from "@/app/shared/StudyHistoryHeader";
import StudyHistoryRows from "@/app/shared/StudyHistoryRows";
import SubjectViewModeToggle from "@/app/shared/SubjectViewModeToggle";
import {
  SUBJECT_VIEW_MODES,
  SUBJECT_VIEW_MODE_VALUES,
  type SubjectViewMode,
} from "@/app/shared/subjectListView";
import { getStoredEnum, setStoredEnum } from "@/lib/clientStorage";
import type { ReviewResult } from "@/lib/domainConstants";

type SortBy = "submittedAt" | "result" | "subjectType" | "subject" | "user";
type SortDir = "asc" | "desc";

/**
 * History keeps its own density preference, separate from the tagged lists.
 * The two surfaces want different defaults — history is for scanning what
 * happened, the lists are for browsing what is in them — and a shared key
 * could only honour one of them.
 */
const HISTORY_VIEW_MODE_STORAGE_KEY = "wr:study-history:view-mode";
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
  // Real arrows: the old "v" / "^" / "<>" rendered as stray punctuation.
  return activeSortBy === sortBy ? (sortDir === "desc" ? "↓" : "↑") : "↕";
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
  const [resultFilter, setResultFilter] = useState<"all" | ReviewResult>("all");
  const [levelFilter, setLevelFilter] = useState<number | "all">("all");
  const [srsBucketFilter, setSrsBucketFilter] = useState<HistorySrsBucket | "all">("all");
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<SubjectViewMode>(() =>
    getStoredEnum(HISTORY_VIEW_MODE_STORAGE_KEY, SUBJECT_VIEW_MODE_VALUES, SUBJECT_VIEW_MODES.list));
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

  function handleSetResultFilter(value: "all" | ReviewResult) {
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
          {/* One sort bar for both sizes; the rows below replace the old
              wide table and the tall mobile cards. */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/55">
            <span>Sort</span>
            {([
              ["submittedAt", "Time"],
              ...(showUserColumn ? [["user", "User"] as const] : []),
              ["subject", "Subject"],
              ["result", "Result"],
            ] as ReadonlyArray<readonly [SortBy, string]>).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => toggleSort(key)}
                aria-pressed={sortBy === key}
                className={`rounded-full border px-3 py-1 transition ${
                  sortBy === key
                    ? "border-accent bg-accent text-white"
                    : "border-line bg-surface text-foreground hover:bg-surface-muted"
                }`}
              >
                {label} {sortIcon(sortBy, key, sortDir)}
              </button>
            ))}

            <SubjectViewModeToggle
              value={viewMode}
              onChange={(next) => {
                setViewMode(next);
                setStoredEnum(HISTORY_VIEW_MODE_STORAGE_KEY, next);
              }}
              className="ml-auto inline-flex items-center rounded-full border border-line bg-surface p-1"
            />
          </div>

          <div className="max-h-168 overflow-auto">
            <StudyHistoryRows
              attempts={data.attempts}
              showUser={showUserColumn}
              onSelect={setSelectedAttemptId}
              viewMode={viewMode}
            />
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
                className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-bold tracking-[0.08em]"
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



