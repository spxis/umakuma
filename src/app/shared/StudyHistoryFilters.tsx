"use client";

import type { HistorySrsBucket } from "@/app/shared/studyHistoryTypes";
import SegmentedControl from "@/app/shared/SegmentedControl";

import { srsBucketBadgeClass, srsBucketLabel, titleCaseSrsBucket } from "./studyHistoryUi";

type Props = {
  pageSize: number;
  setPageSize: (value: number) => void;
  setPage: (value: number) => void;
  resultFilter: "all" | "correct" | "wrong" | "skipped";
  setResultFilter: (value: "all" | "correct" | "wrong" | "skipped") => void;
  levelFilter: number | "all";
  setLevelFilter: (value: number | "all") => void;
  availableLevels: number[];
  srsBucketFilter: HistorySrsBucket | "all";
  setSrsBucketFilter: (value: HistorySrsBucket | "all") => void;
  availableSrsBuckets: HistorySrsBucket[];
};

export default function StudyHistoryFilters({
  pageSize,
  setPageSize,
  setPage,
  resultFilter,
  setResultFilter,
  levelFilter,
  setLevelFilter,
  availableLevels,
  srsBucketFilter,
  setSrsBucketFilter,
  availableSrsBuckets,
}: Props) {
  return (
    <section className="mt-3 rounded-2xl border border-line/70 bg-surface-muted/50 p-2.5 sm:p-3">
      <div className="flex flex-wrap items-start gap-3">
        <div className="space-y-1.5 rounded-xl border border-line/60 bg-surface/75 p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground/65">Page</p>
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/65 sm:text-sm">Size</label>
            <select
              value={pageSize}
              onChange={(event) => {
                setPage(1);
                setPageSize(Number(event.target.value));
              }}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-bold shadow-sm"
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5 rounded-xl border border-line/60 bg-surface/75 p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground/65">Result</p>
          <SegmentedControl
            ariaLabel="Result filter"
            className="inline-flex items-center rounded-full border border-line bg-surface p-1"
            value={resultFilter}
            onChange={setResultFilter}
            size="sm"
            options={[
              { value: "all", label: "All", activeClassName: "bg-accent text-white", inactiveClassName: "text-foreground/80 hover:bg-surface-muted" },
              { value: "correct", label: "Correct", activeClassName: "bg-emerald-600 text-white", inactiveClassName: "text-foreground/80 hover:bg-surface-muted" },
              { value: "wrong", label: "Wrong", activeClassName: "bg-red-600 text-white", inactiveClassName: "text-foreground/80 hover:bg-surface-muted" },
              { value: "skipped", label: "Skipped", activeClassName: "bg-accent text-white", inactiveClassName: "text-foreground/80 hover:bg-surface-muted" },
            ]}
          />
        </div>

        <div className="space-y-1.5 rounded-xl border border-line/60 bg-surface/75 p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground/65">Level</p>
          <select
            value={String(levelFilter)}
            onChange={(event) => {
              const next = Number(event.target.value);
              setLevelFilter(Number.isInteger(next) && next > 0 ? next : "all");
            }}
            className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-bold shadow-sm"
          >
            <option value="all">All</option>
            {availableLevels.map((level) => (
              <option key={`lvl-${level}`} value={level}>L{level}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-line/60 bg-surface/75 p-2.5">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground/65">SRS bucket</p>
        <SegmentedControl
          ariaLabel="SRS filter"
          className="inline-flex flex-wrap items-center rounded-full border border-line bg-surface p-1"
          value={srsBucketFilter}
          onChange={setSrsBucketFilter}
          size="sm"
          options={[
            {
              value: "all",
              label: "SRS all",
              activeClassName: "bg-accent text-white",
              inactiveClassName: "text-foreground/80 hover:bg-surface-muted",
            },
            ...availableSrsBuckets
              .filter((bucket) => bucket !== "unknown")
              .map((bucket) => ({
                value: bucket,
                label: srsBucketLabel(bucket),
                title: titleCaseSrsBucket(bucket),
                activeClassName: `${srsBucketBadgeClass(bucket)} ring-1 ring-offset-0`,
                inactiveClassName: "border border-line text-foreground/75 hover:bg-surface-muted",
              })),
          ]}
        />
      </div>
    </section>
  );
}
