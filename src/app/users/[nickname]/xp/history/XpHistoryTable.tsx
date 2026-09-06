"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";

import SurfacePagination from "@/app/shared/SurfacePagination";
import { formatDateTimeShort } from "@/lib/timeFormat";
import {
  XP_HISTORY_PAGE_SIZES,
  XP_HISTORY_SORTS,
  XP_HISTORY_SORT_DIRS,
  type XpHistoryPage,
  type XpHistorySort,
  type XpHistorySortDir,
} from "@/lib/xp/xpHistoryQuery";

import { XP_LEDGER_HISTORY_COPY as copy } from "../xpHistoryCopy";

const CHIP = "inline-flex h-8 items-center rounded-full border px-3 text-[11px] font-bold transition";
const CHIP_ON = "border-accent bg-accent text-white";
const CHIP_OFF = "border-line bg-surface text-foreground/70 hover:bg-surface-muted";
const HEAD = "pb-2 text-left text-[10px] font-black uppercase tracking-[0.08em] text-foreground/60";

/**
 * The whole XP record, browsable.
 *
 * Fetched a page at a time from `/api/accounts/[id]/xp/history` rather than
 * loaded whole, which is the difference between this and the ledger on the XP
 * page: that one reads every event on the account because it also computes the
 * streak, and it is a summary that stops. This grows forever.
 *
 * Sorting and paging are the same query the study history answers, so a member
 * learns one set of controls for both of their records rather than two.
 */
export default function XpHistoryTable({ accountId }: { accountId: string }) {
  const [kind, setKind] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(XP_HISTORY_PAGE_SIZES[0]);
  const [sortBy, setSortBy] = useState<XpHistorySort>(XP_HISTORY_SORTS.day);
  const [sortDir, setSortDir] = useState<XpHistorySortDir>(XP_HISTORY_SORT_DIRS.desc);

  const query = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      sortBy,
      sortDir,
    });
    if (kind) params.set("kind", kind);
    return `/api/accounts/${encodeURIComponent(accountId)}/xp/history?${params.toString()}`;
  }, [accountId, kind, page, pageSize, sortBy, sortDir]);

  const { data, error, isLoading } = useSWR<XpHistoryPage & { error?: string }>(
    query,
    async (url: string) => {
      const response = await fetch(url, { cache: "no-store" });
      const payload = (await response.json()) as XpHistoryPage & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? copy.failed);
      return payload;
    },
    { revalidateOnFocus: true },
  );

  /* Any change to what is being asked for goes back to page one: staying on
     page 7 of a filter that now has two pages shows an empty table and reads
     as a bug rather than as the end of the list. */
  function reset<T>(set: (value: T) => void) {
    return (value: T) => {
      set(value);
      setPage(1);
    };
  }

  function sortOn(column: XpHistorySort) {
    if (sortBy === column) {
      setSortDir(
        sortDir === XP_HISTORY_SORT_DIRS.desc ? XP_HISTORY_SORT_DIRS.asc : XP_HISTORY_SORT_DIRS.desc,
      );
      return;
    }
    setSortBy(column);
    setSortDir(XP_HISTORY_SORT_DIRS.desc);
    setPage(1);
  }

  const rows = data?.rows ?? [];
  const arrow = (column: XpHistorySort) =>
    sortBy === column ? (sortDir === XP_HISTORY_SORT_DIRS.desc ? " ↓" : " ↑") : "";

  return (
    <section className="space-y-3 rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <p className="text-xs font-semibold text-foreground/60">{copy.grain}</p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => reset(setKind)(null)}
          aria-pressed={kind === null}
          className={`${CHIP} ${kind === null ? CHIP_ON : CHIP_OFF}`}
        >
          {copy.allKinds}
        </button>
        {(data?.facets ?? []).map((facet) => (
          <button
            key={facet.kind}
            type="button"
            onClick={() => reset(setKind)(facet.kind)}
            aria-pressed={kind === facet.kind}
            title={copy.kindCount(facet.count, facet.total)}
            className={`${CHIP} ${kind === facet.kind ? CHIP_ON : CHIP_OFF}`}
          >
            {facet.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-foreground/60">
          {data
            ? copy.summary(rows.length, data.pagination.total, data.filteredTotal)
            : isLoading
              ? copy.loading
              : ""}
        </p>
        <div className="flex gap-1">
          {XP_HISTORY_PAGE_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => reset(setPageSize)(size)}
              aria-pressed={pageSize === size}
              className={`${CHIP} ${pageSize === size ? CHIP_ON : CHIP_OFF}`}
            >
              {copy.perPage(size)}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="text-sm font-semibold text-rose-600">{copy.failed}</p> : null}

      {!error && data && rows.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface-muted/40 p-6 text-center">
          <p className="text-sm font-black text-foreground">
            {kind ? copy.emptyFiltered : copy.empty}
          </p>
          <p className="mt-1 text-xs font-semibold text-foreground/60">{copy.emptyHint}</p>
        </div>
      ) : null}

      {rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr>
                {(
                  [
                    [XP_HISTORY_SORTS.day, copy.columns.day],
                    [XP_HISTORY_SORTS.kind, copy.columns.kind],
                    [XP_HISTORY_SORTS.amount, copy.columns.amount],
                  ] as const
                ).map(([column, label]) => (
                  <th key={column} className={HEAD} scope="col">
                    <button
                      type="button"
                      onClick={() => sortOn(column)}
                      title={copy.sortHint}
                      className="font-black uppercase tracking-[0.08em] hover:text-foreground"
                    >
                      {label}
                      <span aria-hidden="true">{arrow(column)}</span>
                    </button>
                  </th>
                ))}
                <th className={`${HEAD} hidden sm:table-cell`} scope="col">
                  {copy.columns.when}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="py-2 align-top font-bold tabular-nums text-foreground">
                    {row.dayKey}
                  </td>
                  <td className="py-2 align-top">
                    <span className="block font-semibold text-foreground">{row.label}</span>
                    {row.note ? (
                      <span className="block text-[11px] font-semibold text-foreground/60">
                        {row.note}
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2 align-top font-black tabular-nums text-foreground">
                    {row.amount.toLocaleString()}
                  </td>
                  <td className="hidden py-2 align-top text-xs font-semibold tabular-nums text-foreground/60 sm:table-cell">
                    {copy.span(
                      formatDateTimeShort(row.firstAt, "—"),
                      formatDateTimeShort(row.lastAt, "—"),
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <SurfacePagination
        page={data?.pagination.page ?? page}
        pageCount={data?.pagination.totalPages ?? 1}
        slot="bottom"
        placement="bottom"
        onPageChange={setPage}
      />
    </section>
  );
}
