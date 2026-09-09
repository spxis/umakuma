"use client";

import type { HistorySrsBucket } from "@/app/shared/studyHistoryTypes";
import { FilterChipButton, filterChipTone } from "@/app/shared/FilterChip";
import CompactFilterRow from "@/app/shared/CompactFilterRow";
import LevelFilterChips from "@/app/shared/LevelFilterChips";

import { srsBucketBadgeClass, srsBucketLabel, titleCaseSrsBucket } from "./studyHistoryUi";
import FieldLabel from "../shared/FieldLabel";
import { REVIEW_RESULTS, type ReviewResult } from "@/lib/domainConstants";

type ResultFilter = "all" | ReviewResult;

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

const studyChipClass = filterChipTone;

function resultChipClass(result: "all" | ReviewResult, active: boolean): string {
  if (!active) {
    return studyChipClass(false);
  }
  if (result === REVIEW_RESULTS.correct) {
    return "border-emerald-600 bg-emerald-600 text-white";
  }
  if (result === REVIEW_RESULTS.wrong) {
    return "border-red-600 bg-red-600 text-white";
  }
  if (result === REVIEW_RESULTS.skipped) {
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
    <section id="study-history-filters-panel" className="rounded-2xl border border-line bg-surface px-3 py-3 shadow-[0_8px_18px_rgba(8,16,36,0.06)]">
      <FieldLabel>Filters</FieldLabel>

      <div className="mt-2 space-y-2">
        <CompactFilterRow label="Result">
          {(chipClass) =>
            (["all", "correct", "wrong", "skipped"] as const).map((result) => (
              <FilterChipButton
                key={result}
                type="button"
                onClick={() => setResultFilter(result)}
                className={chipClass(resultFilter === result)}
                toneClassName={resultChipClass(result, resultFilter === result)}
                label={result}
                count={(resultCounts[result] ?? 0).toLocaleString("en-US")}
              />
            ))
          }
        </CompactFilterRow>

        <LevelFilterChips
          label="Level"
          levels={availableLevels}
          counts={levelCounts}
          allCount={levelAllCount}
          selected={levelFilter}
          onSelect={setLevelFilter}
        />

        <CompactFilterRow label="SRS">
          {(chipClass) => (
            <>
              <FilterChipButton
                type="button"
                onClick={() => setSrsBucketFilter("all")}
                className={chipClass(srsBucketFilter === "all")}
                toneClassName={studyChipClass(srsBucketFilter === "all")}
                label="SRS all"
                count={srsBucketAllCount.toLocaleString("en-US")}
              />
              {availableSrsBuckets
                .filter((bucket) => bucket !== "unknown")
                .map((bucket) => {
                  const selected = srsBucketFilter === bucket;
                  return (
                    <FilterChipButton
                      key={bucket}
                      type="button"
                      onClick={() => setSrsBucketFilter(bucket)}
                      title={titleCaseSrsBucket(bucket)}
                      className={chipClass(selected)}
                      toneClassName={srsBucketBadgeClass(bucket, selected)}
                      label={srsBucketLabel(bucket)}
                      count={(srsBucketCounts[bucket] ?? 0).toLocaleString("en-US")}
                    />
                  );
                })}
            </>
          )}
        </CompactFilterRow>
      </div>
    </section>
  );
}
