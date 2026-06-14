"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";

import { SUBJECT_TYPE_DISPLAY, SUBJECT_TYPES } from "@/lib/domainConstants";
import { formatDateTimeShort, formatRelativeFromNow } from "@/lib/timeFormat";
import {
  CATALOG_CATEGORY_FILTERS,
  CATALOG_SORT_BY,
  type CatalogBrowseResponse,
  type CatalogCategoryFilter,
  type CatalogSortBy,
  type CatalogSubjectTypeFilter,
} from "@/lib/wanikani/catalogBrowseTypes";

import { useAdminFeedback } from "./AdminFeedbackProvider";
import {
  buildBrowseUrl,
  CATEGORY_LABELS,
  categoryBadgeClass,
  PAGE_SIZE_OPTIONS,
  parseLevelInput,
  sortIndicator,
  SORT_LABELS,
  typeBadgeClass,
  TYPE_LABELS,
} from "./AdminCatalogBrowser.helpers";
import type { AdminCatalogBrowserProps } from "./AdminCatalogBrowser.types";
import AdminPaginationControls from "./AdminPaginationControls";

export default function AdminCatalogBrowser({ sessionAuthorized, checkingSession }: AdminCatalogBrowserProps) {
  const { showToast } = useAdminFeedback();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(40);
  const [typeFilter, setTypeFilter] = useState<CatalogSubjectTypeFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CatalogCategoryFilter>("all");
  const [levelMinInput, setLevelMinInput] = useState("");
  const [levelMaxInput, setLevelMaxInput] = useState("");
  const [sortBy, setSortBy] = useState<CatalogSortBy>("level");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 260);

    return () => {
      clearTimeout(timeout);
    };
  }, [searchInput]);

  const canLoad = sessionAuthorized && !checkingSession;

  const levelMin = parseLevelInput(levelMinInput);
  const levelMax = parseLevelInput(levelMaxInput);

  const queryUrl = useMemo(
    () =>
      canLoad
        ? buildBrowseUrl({
            page,
            pageSize,
            type: typeFilter,
            category: categoryFilter,
            levelMin,
            levelMax,
            sortBy,
            sortDir,
            search: debouncedSearch.length > 0 ? debouncedSearch : null,
          })
        : null,
    [canLoad, categoryFilter, debouncedSearch, levelMax, levelMin, page, pageSize, sortBy, sortDir, typeFilter],
  );

  const { data, error, isLoading, isValidating, mutate } = useSWR<CatalogBrowseResponse>(
    queryUrl,
    async (url: string) => {
      const response = await fetch(url);
      const payload = (await response.json()) as CatalogBrowseResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not load catalog subjects.");
      }

      return payload;
    },
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
      dedupingInterval: 5_000,
    },
  );

  function resetToFirstPage() {
    setPage(1);
  }

  function handleTypeFilter(nextType: CatalogSubjectTypeFilter) {
    setTypeFilter(nextType);
    resetToFirstPage();
  }

  function handleCategoryFilter(nextCategory: CatalogCategoryFilter) {
    setCategoryFilter(nextCategory);
    resetToFirstPage();
  }

  function toggleSort(column: CatalogSortBy) {
    resetToFirstPage();
    if (sortBy !== column) {
      setSortBy(column);
      setSortDir(column === "level" ? "asc" : "desc");
      return;
    }

    setSortDir((previous) => (previous === "asc" ? "desc" : "asc"));
  }

  function clearFilters() {
    setTypeFilter("all");
    setCategoryFilter("all");
    setLevelMinInput("");
    setLevelMaxInput("");
    setSortBy("level");
    setSortDir("asc");
    setSearchInput("");
    setDebouncedSearch("");
    setPage(1);
  }

  async function copySubjectId(subjectId: number) {
    try {
      await navigator.clipboard.writeText(String(subjectId));
      showToast({ tone: "success", message: `Copied subject id ${subjectId}.` });
    } catch {
      showToast({ tone: "error", message: "Could not copy subject id." });
    }
  }

  const byType = data?.filters.facets.byType;
  const byCategory = data?.filters.facets.byCategory;

  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-foreground/60">Browse and manage</p>
          <p className="mt-1 text-sm text-foreground/75">
            Filter and sort the entire catalog with paginated browsing and cached responses.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void mutate();
          }}
          disabled={isLoading || isValidating || !canLoad}
          className="rounded-full border border-line bg-surface-muted px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-foreground transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
        >
          Refresh list
        </button>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-semibold text-foreground/75">
          Search
          <input
            type="text"
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
              resetToFirstPage();
            }}
            placeholder="id, slug, characters, mnemonic"
            className="mt-1 h-9 w-full rounded border border-line bg-surface px-2 text-sm"
          />
        </label>

        <label className="text-xs font-semibold text-foreground/75">
          Sort by
          <select
            value={sortBy}
            onChange={(event) => {
              setSortBy(event.target.value as CatalogSortBy);
              resetToFirstPage();
            }}
            className="mt-1 h-9 w-full rounded border border-line bg-surface px-2 text-sm"
          >
            {CATALOG_SORT_BY.map((option) => (
              <option key={option} value={option}>
                {SORT_LABELS[option]}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-semibold text-foreground/75">
          Sort direction
          <select
            value={sortDir}
            onChange={(event) => {
              setSortDir(event.target.value as "asc" | "desc");
              resetToFirstPage();
            }}
            className="mt-1 h-9 w-full rounded border border-line bg-surface px-2 text-sm"
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </label>

        <label className="text-xs font-semibold text-foreground/75">
          Page size
          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value) as (typeof PAGE_SIZE_OPTIONS)[number]);
              resetToFirstPage();
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

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-semibold text-foreground/75">
          Minimum level
          <input
            type="number"
            min={1}
            max={60}
            value={levelMinInput}
            onChange={(event) => {
              setLevelMinInput(event.target.value);
              resetToFirstPage();
            }}
            placeholder="1"
            className="mt-1 h-9 w-full rounded border border-line bg-surface px-2 text-sm"
          />
        </label>
        <label className="text-xs font-semibold text-foreground/75">
          Maximum level
          <input
            type="number"
            min={1}
            max={60}
            value={levelMaxInput}
            onChange={(event) => {
              setLevelMaxInput(event.target.value);
              resetToFirstPage();
            }}
            placeholder="60"
            className="mt-1 h-9 w-full rounded border border-line bg-surface px-2 text-sm"
          />
        </label>
        <div className="sm:col-span-2 lg:col-span-2">
          <p className="text-xs font-semibold text-foreground/75">Type</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {(["all", SUBJECT_TYPES.radical, SUBJECT_TYPES.kanji, SUBJECT_TYPES.vocabulary] as const).map((typeOption) => (
              <button
                key={typeOption}
                type="button"
                onClick={() => handleTypeFilter(typeOption)}
                className={`rounded-full border px-2 py-1 text-[11px] font-bold uppercase tracking-[0.06em] transition ${
                  typeFilter === typeOption ? "border-accent bg-accent text-white" : "border-line bg-surface-muted text-foreground/75 hover:bg-surface"
                }`}
              >
                {TYPE_LABELS[typeOption]} ({byType?.[typeOption] ?? 0})
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {CATALOG_CATEGORY_FILTERS.map((categoryOption) => (
          <button
            key={categoryOption}
            type="button"
            onClick={() => handleCategoryFilter(categoryOption)}
            className={`rounded-full border px-2 py-1 text-[11px] font-bold uppercase tracking-[0.06em] transition ${
              categoryFilter === categoryOption ? "border-accent bg-accent text-white" : "border-line bg-surface-muted text-foreground/75 hover:bg-surface"
            }`}
          >
            {CATEGORY_LABELS[categoryOption]} ({byCategory?.[categoryOption] ?? 0})
          </button>
        ))}
        <button
          type="button"
          onClick={clearFilters}
          className="rounded-full border border-line bg-surface-muted px-2 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-foreground/75 transition hover:bg-surface"
        >
          Reset
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-foreground/70">
        <span>
          Matched: <strong>{data?.totals.filteredSubjects ?? 0}</strong>
        </span>
        <span>
          Catalog total: <strong>{data?.totals.overallSubjects ?? 0}</strong>
        </span>
        <span>
          Level bounds: <strong>{data?.filters.facets.levelBounds.min ?? "-"}</strong> to <strong>{data?.filters.facets.levelBounds.max ?? "-"}</strong>
        </span>
        <span>
          Cache: <strong>{data?.meta.cacheHit ? "hit" : "miss"}</strong>
        </span>
        <span>
          Generated: <strong>{data ? formatDateTimeShort(data.meta.generatedAt) : "-"}</strong>
        </span>
      </div>

      {isLoading && !data ? <p className="mt-3 text-sm text-foreground/70">Loading catalog subjects...</p> : null}
      {error ? <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{error.message}</p> : null}

      {data ? (
        <>
          <div className="mt-3 overflow-x-auto rounded-xl border border-line">
            <table className="min-w-full border-collapse text-left text-xs text-foreground/85 sm:text-sm">
              <thead className="bg-surface-muted text-foreground/65">
                <tr>
                  <th className="px-2 py-2">
                    <button type="button" onClick={() => toggleSort("level")} className="font-bold">
                      Level {sortIndicator(sortBy, sortDir, "level")}
                    </button>
                  </th>
                  <th className="px-2 py-2">
                    <button type="button" onClick={() => toggleSort("subjectType")} className="font-bold">
                      Type {sortIndicator(sortBy, sortDir, "subjectType")}
                    </button>
                  </th>
                  <th className="px-2 py-2">Subject</th>
                  <th className="px-2 py-2">Primary meaning</th>
                  <th className="px-2 py-2">Category</th>
                  <th className="px-2 py-2">
                    <button type="button" onClick={() => toggleSort("dataUpdatedAt")} className="font-bold">
                      Data updated {sortIndicator(sortBy, sortDir, "dataUpdatedAt")}
                    </button>
                  </th>
                  <th className="px-2 py-2">
                    <button type="button" onClick={() => toggleSort("wkSubjectId")} className="font-bold">
                      ID {sortIndicator(sortBy, sortDir, "wkSubjectId")}
                    </button>
                  </th>
                  <th className="px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/50 bg-surface">
                {data.items.map((item) => (
                  <tr key={item.wkSubjectId} className="align-top">
                    <td className="px-2 py-2">{item.level}</td>
                    <td className="px-2 py-2">
                      <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.06em] ${typeBadgeClass(item.subjectType)}`}>
                        {SUBJECT_TYPE_DISPLAY[item.subjectType].short}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <p className="font-semibold text-foreground">{item.characters ?? item.slug ?? "-"}</p>
                      <p className="text-[11px] text-foreground/60">{item.slug ?? "No slug"}</p>
                    </td>
                    <td className="px-2 py-2">{item.primaryMeaning ?? "-"}</td>
                    <td className="px-2 py-2">
                      <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.06em] ${categoryBadgeClass(item.category)}`}>
                        {CATEGORY_LABELS[item.category]}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <p>{formatDateTimeShort(item.dataUpdatedAt)}</p>
                      <p className="text-[11px] text-foreground/60">{formatRelativeFromNow(item.dataUpdatedAt, { style: "short", allowFuture: false })}</p>
                    </td>
                    <td className="px-2 py-2 font-mono text-xs">{item.wkSubjectId}</td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            void copySubjectId(item.wkSubjectId);
                          }}
                          className="rounded-full border border-line bg-surface-muted px-2 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-foreground/80 transition hover:bg-surface"
                        >
                          Copy id
                        </button>
                        {item.documentUrl ? (
                          <a
                            href={item.documentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-line bg-surface-muted px-2 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-foreground/80 transition hover:bg-surface"
                          >
                            Open
                          </a>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!data.items.length ? (
            <p className="mt-3 rounded-lg border border-line bg-surface-muted px-3 py-2 text-sm font-semibold text-foreground/75">
              No subjects match this filter set. Try a broader search or clear filters.
            </p>
          ) : null}

          <AdminPaginationControls
            page={data.pagination.page}
            pageCount={data.pagination.totalPages}
            itemLabel="subjects"
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
