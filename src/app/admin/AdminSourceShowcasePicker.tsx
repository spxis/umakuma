"use client";

import { useState } from "react";
import useSWR from "swr";

import { SOURCE_CREDITS, type SourceKey } from "@/lib/sourceCredits";
import { SHOWCASE_MAX_ROWS, type ShowcaseRow } from "@/lib/sourceShowcase";

import { ADMIN_SOURCES_COPY as copy } from "./AdminSources.constants";
import { useAdminFeedback } from "./AdminFeedbackProvider";

type RowsPage = { rows: ShowcaseRow[]; total: number; page: number; pageSize: number };

const sameRow = (left: ShowcaseRow, right: ShowcaseRow) =>
  left.specimen === right.specimen && left.detail === right.detail;

/**
 * Pick the rows the public page shows, out of the source's own data.
 *
 * The picks were hand-written constants, and checking the first draft against
 * the data caught thirteen wrong figures - a radical said to be in 1,443
 * characters that is in 1,337, a kanji put on WaniKani level 60 that is on 50.
 * Every one of them was written by somebody reading carefully. So the rows an
 * admin can choose are built from the data rather than typed over it, and the
 * detail line saved is the line this browser drew.
 */
export default function AdminSourceShowcasePicker({
  source,
  onClose,
}: {
  source: SourceKey;
  onClose: () => void;
}) {
  const { showToast } = useAdminFeedback();
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<ShowcaseRow[] | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: current } = useSWR<{ rows: ShowcaseRow[] }>(
    `/api/admin/sources/${source}/showcase`,
    async (url: string) => (await fetch(url)).json(),
    { revalidateOnFocus: false },
  );

  const { data, isLoading } = useSWR<RowsPage>(
    `/api/admin/sources/${source}/rows?page=${page}&q=${encodeURIComponent(query)}`,
    async (url: string) => (await fetch(url)).json(),
    { revalidateOnFocus: false, keepPreviousData: true },
  );

  const chosen = picked ?? current?.rows ?? [];
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  function toggle(row: ShowcaseRow) {
    const without = chosen.filter((entry) => !sameRow(entry, row));
    if (without.length !== chosen.length) return setPicked(without);
    if (chosen.length >= SHOWCASE_MAX_ROWS) {
      showToast({ message: copy.picker.full(SHOWCASE_MAX_ROWS), tone: "error" });
      return;
    }
    setPicked([...chosen, row]);
  }

  async function save(rows: ShowcaseRow[]) {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/sources/${source}/showcase`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      if (!response.ok) throw new Error();
      showToast(copy.picker.saved(SOURCE_CREDITS[source].source));
      setPicked(null);
      onClose();
    } catch {
      showToast({ message: copy.picker.saveFailed, tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-line bg-surface-muted/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          onKeyDown={(event) => {
            /* Escape clears, then puts the box away - the repo's rule. */
            if (event.key !== "Escape") return;
            if (query) setQuery("");
            else event.currentTarget.blur();
          }}
          placeholder={copy.picker.search}
          className="h-8 min-w-[12rem] flex-1 rounded-full border border-line bg-surface px-3 text-sm"
        />
        <p className="text-[11px] font-semibold text-foreground/70">
          {data ? copy.picker.range(data.total) : copy.picker.reading}
        </p>
      </div>

      <ul className="mt-2 divide-y divide-line/60">
        {(data?.rows ?? []).map((row) => {
          const isPicked = chosen.some((entry) => sameRow(entry, row));
          return (
            <li key={`${row.specimen}-${row.detail}`}>
              <label className="flex cursor-pointer items-baseline gap-2 py-1.5">
                <input type="checkbox" checked={isPicked} onChange={() => toggle(row)} className="mt-1" />
                <span className="font-black text-foreground">{row.specimen}</span>
                <span className="text-[13px] font-semibold text-foreground/70">{row.detail}</span>
              </label>
            </li>
          );
        })}
        {!isLoading && (data?.rows.length ?? 0) === 0 ? (
          <li className="py-2 text-sm text-foreground/70">{copy.picker.none}</li>
        ) : null}
      </ul>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <PagerButton onClick={() => setPage((n) => Math.max(1, n - 1))} disabled={page <= 1}>
            {copy.picker.previous}
          </PagerButton>
          <span className="text-[11px] font-semibold tabular-nums text-foreground/70">
            {page} / {pages}
          </span>
          <PagerButton onClick={() => setPage((n) => Math.min(pages, n + 1))} disabled={page >= pages}>
            {copy.picker.next}
          </PagerButton>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black text-foreground/70">
            {copy.picker.count(chosen.length, SHOWCASE_MAX_ROWS)}
          </span>
          <PagerButton onClick={() => save([])} disabled={saving}>
            {copy.picker.reset}
          </PagerButton>
          <button
            type="button"
            onClick={() => save(chosen)}
            disabled={saving}
            className="inline-flex h-8 items-center rounded-full border border-accent bg-accent px-3 text-[11px] font-black uppercase tracking-[0.08em] text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {saving ? copy.picker.saving : copy.picker.save}
          </button>
        </div>
      </div>
    </div>
  );
}

function PagerButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-8 items-center rounded-full border border-line bg-surface px-3 text-[11px] font-black uppercase tracking-[0.08em] text-foreground/70 transition hover:bg-surface-muted disabled:opacity-40"
    >
      {children}
    </button>
  );
}
