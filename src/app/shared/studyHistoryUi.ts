import type { HistorySrsBucket } from "@/app/shared/studyHistoryTypes";
import {
  SRS_BUCKETS,
  SRS_BUCKET_SHORT_LABELS,
  SRS_BUCKET_TITLE_LABELS,
} from "@/lib/domainConstants";
import { srsFilterButtonLabel } from "@/app/users/[nickname]/level-explorer/lib/levelExplorerDisplayClasses";
import { STUDY_SRS_FILTERS, studySrsToneClass } from "@/app/users/[nickname]/study-explorer/components/StudyExplorer.constants";

type SrsBucketUiMeta = {
  shortLabel: string;
};

const SRS_BUCKET_UI_META: Record<HistorySrsBucket, SrsBucketUiMeta> = {
  [SRS_BUCKETS.apprentice]: {
    shortLabel: srsFilterButtonLabel(STUDY_SRS_FILTERS.apprentice),
  },
  [SRS_BUCKETS.guru]: {
    shortLabel: srsFilterButtonLabel(STUDY_SRS_FILTERS.guru),
  },
  [SRS_BUCKETS.master]: {
    shortLabel: srsFilterButtonLabel(STUDY_SRS_FILTERS.master),
  },
  [SRS_BUCKETS.enlightened]: {
    shortLabel: srsFilterButtonLabel(STUDY_SRS_FILTERS.enlightened),
  },
  [SRS_BUCKETS.burned]: {
    shortLabel: srsFilterButtonLabel(STUDY_SRS_FILTERS.burned),
  },
  [SRS_BUCKETS.locked]: {
    shortLabel: srsFilterButtonLabel(STUDY_SRS_FILTERS.locked),
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
