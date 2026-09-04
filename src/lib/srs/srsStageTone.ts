import { SRS_BUCKETS, type SrsBucket } from "@/lib/domainConstants";

/**
 * The colour an SRS stage is drawn in, everywhere.
 *
 * The Study filters have coloured their status chips pink / violet / sky /
 * amber since long before themes existed, and a member reads those colours as
 * the stages themselves — pink is early, sky is nearly done. A theme changes
 * the words on a rung, never where that rung sits, so the colour must not
 * change with it either.
 *
 * This exists because it had already drifted: the themes viewer had grown its
 * own map with violet as purple and enlightened as indigo, so the same stage
 * was two colours on two pages of the same site. `studySrsToneClass` remains
 * the interactive chip (it needs active and hover states); this is the flat
 * tone for anything that is displaying a stage rather than filtering by one.
 *
 * Burned is deliberately neutral, matching the Study filter's own fallback.
 * The top rung is the one a member has finished with — for now: ours can be
 * pulled back down, which is why themes name it for mastery rather than for
 * retirement.
 */
export const SRS_STAGE_BUCKET: Record<number, SrsBucket> = {
  0: SRS_BUCKETS.locked,
  1: SRS_BUCKETS.apprentice,
  2: SRS_BUCKETS.apprentice,
  3: SRS_BUCKETS.apprentice,
  4: SRS_BUCKETS.apprentice,
  5: SRS_BUCKETS.guru,
  6: SRS_BUCKETS.guru,
  7: SRS_BUCKETS.master,
  8: SRS_BUCKETS.enlightened,
  9: SRS_BUCKETS.burned,
};

export const SRS_BUCKET_TONE: Record<string, string> = {
  [SRS_BUCKETS.apprentice]: "bg-pink-100 text-pink-700",
  [SRS_BUCKETS.guru]: "bg-violet-100 text-violet-700",
  [SRS_BUCKETS.master]: "bg-sky-100 text-sky-700",
  [SRS_BUCKETS.enlightened]: "bg-amber-100 text-amber-700",
  [SRS_BUCKETS.burned]: "bg-surface-muted text-foreground",
  [SRS_BUCKETS.locked]: "bg-surface-muted text-foreground/60",
  [SRS_BUCKETS.unknown]: "bg-surface-muted text-foreground/60",
};

/** The flat tone for a stage, 0-9. */
export function srsStageTone(stage: number): string {
  return SRS_BUCKET_TONE[SRS_STAGE_BUCKET[stage] ?? SRS_BUCKETS.unknown];
}
