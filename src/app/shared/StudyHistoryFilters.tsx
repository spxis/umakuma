"use client";

import type { HistorySrsBucket } from "@/app/shared/studyHistoryTypes";
import SegmentedControl from "@/app/shared/SegmentedControl";

import { srsBucketBadgeClass, srsBucketLabel, titleCaseSrsBucket } from "./studyHistoryUi";

type Props = {
  resultFilter: "all" | "correct" | "wrong" | "skipped";
  setResultFilter: (value: "all" | "correct" | "wrong" | "skipped") => void;
  levelFilter: number | "all";
  setLevelFilter: (value: number | "all") => void;
  availableLevels: number[];
  srsBucketFilter: HistorySrsBucket | "all";
  setSrsBucketFilter: (value: HistorySrsBucket | "all") => void;
  availableSrsBuckets: HistorySrsBucket[];
};

function studyChipClass(active: boolean): string {
  return active
    ? "border-accent bg-accent text-white"
    : "border-line bg-surface text-foreground hover:bg-surface-muted";
}

export default function StudyHistoryFilters({
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
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setLevelFilter("all")}
              className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] whitespace-nowrap ${studyChipClass(levelFilter === "all")}`}
            >
              All
            </button>
            {availableLevels.map((level) => (
              <button
                key={`lvl-${level}`}
                type="button"
                onClick={() => setLevelFilter(level)}
                className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] whitespace-nowrap ${studyChipClass(levelFilter === level)}`}
              >
                L{level}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-line/60 bg-surface/75 p-2.5">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground/65">SRS bucket</p>
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setSrsBucketFilter("all")}
            className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] whitespace-nowrap ${studyChipClass(srsBucketFilter === "all")}`}
          >
            SRS all
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
                  className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] whitespace-nowrap ${selected ? srsBucketBadgeClass(bucket) : studyChipClass(false)}`}
                >
                  {srsBucketLabel(bucket)}
                </button>
              );
            })}
        </div>
      </div>
    </section>
  );
}
