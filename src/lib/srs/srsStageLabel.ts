import { SRS_BUCKETS, SRS_BUCKET_SHORT_LABELS } from "@/lib/domainConstants";

import { SRS_STAGE_BUCKET } from "./srsStageTone";

/**
 * The one way a stage says which stage it is.
 *
 * `APPR - SRS 4`. Space-hyphen-space, one string, built here rather than at
 * the call site: `StatusSrsChip` had it as a template literal inside its JSX
 * with a comment explaining that splitting it into three children had once
 * produced `APPR- SRS4`, and the theme rungs needed the same anchor. Two
 * copies of a format whose whole point is that the spacing is fragile is how
 * the site ends up saying it two ways.
 *
 * The separator is a hyphen and not the middot the theme tooltips use. Those
 * are prose; this is a badge, and it has read this way on the Study explorer
 * since long before themes existed.
 */
export function srsStageLabel(shortLabel: string, stage: number): string {
  return `${shortLabel} - SRS ${stage}`;
}

/**
 * The same label for a bare stage number, with no WaniKani status to hand.
 *
 * A theme rung knows it is stage 4 and nothing else - there is no assignment
 * behind it and no member status to read - so the bucket comes from the stage
 * itself, which is the mapping the tones already use. Stage 0 has no anchor to
 * give: it is the rung an item has not left rather than one it climbed.
 */
export function srsStageLabelForStage(stage: number): string | null {
  if (stage <= 0) return null;
  const bucket = SRS_STAGE_BUCKET[stage] ?? SRS_BUCKETS.unknown;
  return srsStageLabel(SRS_BUCKET_SHORT_LABELS[bucket], stage);
}
