import type { HistorySrsBucket } from "@/app/shared/studyHistoryTypes";
import {
  REVIEW_RESULTS,
  SRS_BUCKETS,
  SRS_BUCKET_SHORT_LABELS,
  SRS_BUCKET_TITLE_LABELS,
  isReviewResult,
  type ReviewResult,
} from "@/lib/domainConstants";
import { studySrsToneClass } from "@/app/users/[nickname]/study-explorer/components/StudyExplorer.constants";

type SrsBucketUiMeta = {
  shortLabel: string;
};

const SRS_BUCKET_UI_META: Record<HistorySrsBucket, SrsBucketUiMeta> = {
  [SRS_BUCKETS.apprentice]: {
    shortLabel: SRS_BUCKET_SHORT_LABELS[SRS_BUCKETS.apprentice],
  },
  [SRS_BUCKETS.guru]: {
    shortLabel: SRS_BUCKET_SHORT_LABELS[SRS_BUCKETS.guru],
  },
  [SRS_BUCKETS.master]: {
    shortLabel: SRS_BUCKET_SHORT_LABELS[SRS_BUCKETS.master],
  },
  [SRS_BUCKETS.enlightened]: {
    shortLabel: SRS_BUCKET_SHORT_LABELS[SRS_BUCKETS.enlightened],
  },
  [SRS_BUCKETS.burned]: {
    shortLabel: SRS_BUCKET_SHORT_LABELS[SRS_BUCKETS.burned],
  },
  [SRS_BUCKETS.locked]: {
    shortLabel: SRS_BUCKET_SHORT_LABELS[SRS_BUCKETS.locked],
  },
  [SRS_BUCKETS.unknown]: {
    shortLabel: SRS_BUCKET_SHORT_LABELS[SRS_BUCKETS.unknown],
  },
};

export function srsBucketLabel(value: HistorySrsBucket): string {
  return SRS_BUCKET_UI_META[value].shortLabel;
}

export function srsBucketBadgeClass(value: HistorySrsBucket, active = true): string {
  if (value === SRS_BUCKETS.unknown) {
    return active
      ? "border-gray-300 text-gray-500 bg-white"
      : "border-line bg-surface text-foreground hover:bg-surface-muted";
  }

  return studySrsToneClass(value, active);
}

export function titleCaseSrsBucket(value: HistorySrsBucket): string {
  return SRS_BUCKET_TITLE_LABELS[value];
}

type ReviewResultUiMeta = {
  mark: string;
  label: string;
  tone: string;
};

/** How each outcome reads in a row: a mark, its accessible name, and its tone. */
export const STUDY_HISTORY_RESULTS: Record<ReviewResult, ReviewResultUiMeta> = {
  [REVIEW_RESULTS.correct]: {
    mark: "✓",
    label: "Correct",
    tone: "border-emerald-500/40 bg-emerald-50 text-emerald-700",
  },
  [REVIEW_RESULTS.wrong]: {
    mark: "✕",
    label: "Wrong",
    tone: "border-red-500/40 bg-red-50 text-red-700",
  },
  [REVIEW_RESULTS.skipped]: {
    mark: "–",
    label: "Skipped",
    tone: "border-amber-500/40 bg-amber-50 text-amber-700",
  },
};

/** Anything unrecognized reads as skipped, which is what it was before. */
export function resultMeta(result: string): ReviewResultUiMeta {
  return STUDY_HISTORY_RESULTS[isReviewResult(result) ? result : REVIEW_RESULTS.skipped];
}
