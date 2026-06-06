"use client";

import type { HistorySrsBucket } from "@/app/shared/studyHistoryTypes";

import { srsBucketBadgeClass, srsBucketLabel, titleCaseSrsBucket } from "./studyHistoryUi";

type ResultFilter = "all" | "correct" | "wrong" | "skipped";

type Props = {
  resultFilter: ResultFilter;
  setResultFilter: (value: ResultFilter) => void;
  resultCounts: Record<ResultFilter, number>;
  levelFilter: number | "all";
  setLevelFilter: (value: number | "all") => void;
  availableLevels: number[];
  levelAllCount: number;
  levelCounts: Record<number, number>;
  srsBucketFilter: HistorySrsBucket | "all";
  setSrsBucketFilter: (value: HistorySrsBucket | "all") => void;
  availableSrsBuckets: HistorySrsBucket[];
  srsBucketAllCount: number;
  srsBucketCounts: Record<HistorySrsBucket, number>;
};

function chipLabelWithCount(label: string, count: number): string {
  return `${label} (${count.toLocaleString("en-US")})`;
}

function studyChipClass(active: boolean): string {
  return active
    ? "border-accent bg-accent text-white"
    : "border-line bg-surface text-foreground hover:bg-surface-muted";
}

function resultChipClass(result: "all" | "correct" | "wrong" | "skipped", active: boolean): string {
  if (!active) {
    return studyChipClass(false);
  }
  if (result === "correct") {
    return "border-emerald-600 bg-emerald-600 text-white";
  }
  if (result === "wrong") {
    return "border-red-600 bg-red-600 text-white";
  }
  if (result === "skipped") {
    return "border-amber-500 bg-amber-500 text-white";
  }
  return studyChipClass(true);
}

export default function StudyHistoryFilters({
  resultFilter,
  setResultFilter,
  resultCounts,
  levelFilter,
  setLevelFilter,
  availableLevels,
  levelAllCount,
  levelCounts,
  srsBucketFilter,
  setSrsBucketFilter,
  availableSrsBuckets,
  srsBucketAllCount,
  srsBucketCounts,
}: Props) {
  return (
    <section className="rounded-2xl border border-line bg-surface px-3 py-3 shadow-[0_8px_18px_rgba(8,16,36,0.06)]">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-foreground/70">Filters</p>

      <div className="mt-2 space-y-2">
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line px-2.5 py-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/65">Result</span>
          {(["all", "correct", "wrong", "skipped"] as const).map((result) => (
            <button
              key={result}
              type="button"
              onClick={() => setResultFilter(result)}
              className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] whitespace-nowrap ${resultChipClass(result, resultFilter === result)}`}
            >
              {chipLabelWithCount(result, resultCounts[result] ?? 0)}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line px-2.5 py-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/65">Level</span>
          <button
            type="button"
            onClick={() => setLevelFilter("all")}
            className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] whitespace-nowrap ${studyChipClass(levelFilter === "all")}`}
          >
            {chipLabelWithCount("All", levelAllCount)}
          </button>
          {availableLevels.map((level) => (
            <button
              key={`lvl-${level}`}
              type="button"
              onClick={() => setLevelFilter(level)}
              className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] whitespace-nowrap ${studyChipClass(levelFilter === level)}`}
            >
              {chipLabelWithCount(String(level), levelCounts[level] ?? 0)}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line px-2.5 py-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/65">SRS bucket</span>
          <button
            type="button"
            onClick={() => setSrsBucketFilter("all")}
            className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] whitespace-nowrap ${studyChipClass(srsBucketFilter === "all")}`}
          >
            {chipLabelWithCount("SRS all", srsBucketAllCount)}
          </button>
          {availableSrsBuckets
            .filter((bucket) => bucket !== "unknown")
            .map((bucket) => {
              const selected = srsBucketFilter === bucket;
              return (
                <button
                  key={bucket}
                  type="button"
                  onClick={() => setSrsBucketFilter(bucket)}
                  title={titleCaseSrsBucket(bucket)}
                  className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] whitespace-nowrap ${srsBucketBadgeClass(bucket, selected)}`}
                >
                  {chipLabelWithCount(srsBucketLabel(bucket), srsBucketCounts[bucket] ?? 0)}
                </button>
              );
            })}
        </div>
      </div>
    </section>
  );
}
