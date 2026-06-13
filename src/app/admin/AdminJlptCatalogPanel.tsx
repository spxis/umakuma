"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";

import { formatDateTimeShort, formatRelativeFromNow } from "@/lib/timeFormat";
import {
  JLPT_CATALOG_ENRICHMENT_FILTERS,
  JLPT_CATALOG_SORT_BY,
  type JlptCatalogEnrichmentFilter,
  type JlptCatalogResponse,
  type JlptCatalogSortBy,
  type JlptCatalogSortDir,
} from "@/lib/jlptCatalogTypes";

import { useAdminFeedback } from "./AdminFeedbackProvider";
import AdminPaginationControls from "./AdminPaginationControls";

type AdminJlptCatalogPanelProps = {
  sessionAuthorized: boolean;
  checkingSession: boolean;
};

const PAGE_SIZE_OPTIONS = [20, 40, 80, 120] as const;

function sortIndicator(activeSortBy: JlptCatalogSortBy, activeSortDir: JlptCatalogSortDir, columnSortBy: JlptCatalogSortBy): string {
  if (activeSortBy !== columnSortBy) {
    return "<>";
  }

  return activeSortDir === "asc" ? "^" : "v";
}

function enrichmentBadgeClass(hasEnrichment: boolean): string {
  return hasEnrichment
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : "border-amber-200 bg-amber-50 text-amber-800";
}

function buildCatalogUrl(input: {
  page: number;
  pageSize: number;
  nLevel: "all" | "1" | "2" | "3" | "4" | "5";
  enrichment: JlptCatalogEnrichmentFilter;
  search: string | null;
  sortBy: JlptCatalogSortBy;
  sortDir: JlptCatalogSortDir;
  download?: boolean;
}): string {
  const params = new URLSearchParams({
    page: String(input.page),
    pageSize: String(input.pageSize),
    nLevel: input.nLevel,
    enrichment: input.enrichment,
    sortBy: input.sortBy,
    sortDir: input.sortDir,
  });

  if (input.search) {
    params.set("search", input.search);
  }

  if (input.download) {
    params.set("download", "1");
  }

  return `/api/admin/jlpt/catalog?${params.toString()}`;
}

export default function AdminJlptCatalogPanel({ sessionAuthorized, checkingSession }: AdminJlptCatalogPanelProps) {
  const { confirmAction } = useAdminFeedback();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(40);
  const [nLevel, setNLevel] = useState<"all" | "1" | "2" | "3" | "4" | "5">("all");
  const [enrichment, setEnrichment] = useState<JlptCatalogEnrichmentFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [sortBy, setSortBy] = useState<JlptCatalogSortBy>("nLevel");
  const [sortDir, setSortDir] = useState<JlptCatalogSortDir>("asc");

  const queryUrl = useMemo(() => {
    if (!sessionAuthorized || checkingSession) {
      return null;
    }

    return buildCatalogUrl({
      page,
      pageSize,
      nLevel,
      enrichment,
      search: searchInput.trim().length > 0 ? searchInput.trim() : null,
      sortBy,
      sortDir,
    });
  }, [checkingSession, enrichment, nLevel, page, pageSize, searchInput, sessionAuthorized, sortBy, sortDir]);

  const { data, error, isLoading, isValidating, mutate } = useSWR<JlptCatalogResponse>(
    queryUrl,
    async (url: string) => {
      const response = await fetch(url);
      const payload = (await response.json()) as JlptCatalogResponse & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not load JLPT catalog.");
      }
      return payload;
    },
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
      dedupingInterval: 5_000,
    },
  );

  function resetFilters() {
    setPage(1);
    setPageSize(40);
    setNLevel("all");
    setEnrichment("all");
    setSearchInput("");
    setSortBy("nLevel");
    setSortDir("asc");
  }

  function toggleSort(nextSortBy: JlptCatalogSortBy) {
    setPage(1);

    if (sortBy !== nextSortBy) {
      setSortBy(nextSortBy);
      setSortDir(nextSortBy === "kanji" ? "asc" : "desc");
      return;
    }

    setSortDir((previous) => (previous === "asc" ? "desc" : "asc"));
  }

  const downloadUrl = buildCatalogUrl({
    page: 1,
    pageSize: 5000,
    nLevel,
    enrichment,
    search: searchInput.trim().length > 0 ? searchInput.trim() : null,
    sortBy,
    sortDir,
    download: true,
  });

  async function triggerDownload() {
    const accepted = await confirmAction({
      title: "Download JLPT JSON snapshot",
      description: `Scope: up to ${data?.summary.filteredRows ?? "-"} filtered rows (max 5000 rows per export). Time: usually under 1 minute. Risk: non-destructive file export. Continue?`,
      confirmLabel: "Download JSON",
      cancelLabel: "Cancel",
      tone: "neutral",
    });

    if (!accepted) {
      return;
    }

    window.location.assign(downloadUrl);
  }

  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-foreground/60">Browse and manage</p>
          <p className="mt-1 text-sm text-foreground/75">
            Browse JLPT DB rows, filter enrichment state, and export current results to JSON for offline work.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              void mutate();
            }}
            disabled={isLoading || isValidating || checkingSession || !sessionAuthorized}
            className="rounded-full border border-line bg-surface-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-foreground transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
          >
            Refresh list
          </button>
          <button
            type="button"
            onClick={() => {
              void triggerDownload();
            }}
            disabled={checkingSession || !sessionAuthorized}
            className="rounded-full border border-line bg-surface-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-foreground transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
          >
            Download JSON
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
        <label className="text-xs font-semibold text-foreground/75 lg:col-span-2">
          Search
          <input
            type="text"
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
              setPage(1);
            }}
            placeholder="Kanji or meaning"
            className="mt-1 h-9 w-full rounded border border-line bg-surface px-2 text-sm"
          />
        </label>

        <label className="text-xs font-semibold text-foreground/75">
          JLPT level
          <select
            value={nLevel}
            onChange={(event) => {
              setNLevel(event.target.value as "all" | "1" | "2" | "3" | "4" | "5");
              setPage(1);
            }}
            className="mt-1 h-9 w-full rounded border border-line bg-surface px-2 text-sm"
          >
            <option value="all">All</option>
            <option value="1">N1</option>
            <option value="2">N2</option>
            <option value="3">N3</option>
            <option value="4">N4</option>
            <option value="5">N5</option>
          </select>
        </label>

        <label className="text-xs font-semibold text-foreground/75">
          Enrichment
          <select
            value={enrichment}
            onChange={(event) => {
              setEnrichment(event.target.value as JlptCatalogEnrichmentFilter);
              setPage(1);
            }}
            className="mt-1 h-9 w-full rounded border border-line bg-surface px-2 text-sm"
          >
            {JLPT_CATALOG_ENRICHMENT_FILTERS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-semibold text-foreground/75">
          Sort by
          <select
            value={sortBy}
            onChange={(event) => {
              setSortBy(event.target.value as JlptCatalogSortBy);
              setPage(1);
            }}
            className="mt-1 h-9 w-full rounded border border-line bg-surface px-2 text-sm"
          >
            {JLPT_CATALOG_SORT_BY.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-semibold text-foreground/75">
          Page size
          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value) as (typeof PAGE_SIZE_OPTIONS)[number]);
              setPage(1);
            }}
            className="mt-1 h-9 w-full rounded border border-line bg-surface px-2 text-sm"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={resetFilters}
          className="rounded-full border border-line bg-surface-muted px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-foreground transition hover:bg-surface"
        >
          Reset filters
        </button>
        {data ? (
          <>
            <span className="text-xs text-foreground/70">
              Filtered: <strong>{data.summary.filteredRows}</strong>
            </span>
            <span className="text-xs text-foreground/70">
              Total: <strong>{data.summary.totalRows}</strong>
            </span>
            <span className="text-xs text-foreground/70">
              Missing enrichment: <strong>{data.summary.missingEnrichmentRows}</strong>
            </span>
            <span className="text-xs text-foreground/70">
              jlptReadings.json entries: <strong>{data.jsonSource.entryCount}</strong>
            </span>
          </>
        ) : null}
      </div>

      {data ? (
        <p className="mt-2 text-xs text-foreground/65">
          jlptReadings source: {data.jsonSource.path} via {data.jsonSource.generatedBy}. Updated: {formatDateTimeShort(data.jsonSource.updatedAt)}.
        </p>
      ) : null}

      {isLoading && !data ? <p className="mt-3 text-sm text-foreground/70">Loading JLPT catalog...</p> : null}
      {error ? <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{error.message}</p> : null}

      {data ? (
        <>
          <div className="mt-3 overflow-x-auto rounded-xl border border-line">
            <table className="min-w-full border-collapse text-left text-xs text-foreground/85 sm:text-sm">
              <thead className="bg-surface-muted text-foreground/65">
                <tr>
                  <th className="px-2 py-2">
                    <button type="button" onClick={() => toggleSort("kanji")} className="font-bold">
                      Kanji {sortIndicator(sortBy, sortDir, "kanji")}
                    </button>
                  </th>
                  <th className="px-2 py-2">
                    <button type="button" onClick={() => toggleSort("nLevel")} className="font-bold">
                      JLPT {sortIndicator(sortBy, sortDir, "nLevel")}
                    </button>
                  </th>
                  <th className="px-2 py-2">Primary meaning</th>
                  <th className="px-2 py-2">Readings</th>
                  <th className="px-2 py-2">Stroke</th>
                  <th className="px-2 py-2">Source JLPT</th>
                  <th className="px-2 py-2">
                    <button type="button" onClick={() => toggleSort("enrichedAt")} className="font-bold">
                      Enriched {sortIndicator(sortBy, sortDir, "enrichedAt")}
                    </button>
                  </th>
                  <th className="px-2 py-2">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/50 bg-surface">
                {data.items.map((item) => (
                  <tr key={item.kanji} className="align-top">
                    <td className="px-2 py-2 text-xl font-black text-foreground">{item.kanji}</td>
                    <td className="px-2 py-2">
                      <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-blue-800">
                        N{item.nLevel}
                      </span>
                    </td>
                    <td className="px-2 py-2">{item.primaryMeaning ?? "-"}</td>
                    <td className="px-2 py-2">
                      <span className="text-[11px] text-foreground/65">
                        on {item.onReadingsCount}, kun {item.kunReadingsCount}, nanori {item.nanoriReadingsCount}
                      </span>
                    </td>
                    <td className="px-2 py-2">{item.strokeCount ?? "-"}</td>
                    <td className="px-2 py-2">{item.sourceJlpt ?? "-"}</td>
                    <td className="px-2 py-2">
                      <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.06em] ${enrichmentBadgeClass(Boolean(item.enrichedAt))}`}>
                        {item.enrichedAt ? formatRelativeFromNow(item.enrichedAt, { style: "short", allowFuture: false }) : "missing"}
                      </span>
                    </td>
                    <td className="px-2 py-2">{formatDateTimeShort(item.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!data.items.length ? (
            <p className="mt-3 rounded-lg border border-line bg-surface-muted px-3 py-2 text-sm font-semibold text-foreground/75">
              No JLPT rows match this filter set.
            </p>
          ) : null}

          <AdminPaginationControls
            page={data.pagination.page}
            pageCount={data.pagination.totalPages}
            itemLabel="rows"
            total={data.pagination.total}
            onFirst={() => setPage(1)}
            onPrevious={() => setPage((previous) => Math.max(1, previous - 1))}
            onNext={() => setPage((previous) => Math.min(data.pagination.totalPages, previous + 1))}
            onLast={() => setPage(data.pagination.totalPages)}
            onPageChange={(nextPage) => setPage(nextPage)}
            disabled={isLoading || isValidating}
          />
        </>
      ) : null}
    </section>
  );
}
