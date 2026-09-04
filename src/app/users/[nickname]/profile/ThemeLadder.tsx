"use client";

import { japaneseTextProps } from "@/app/shared/japaneseText";
import { srsStageTone } from "@/lib/srs/srsStageTone";
import { srsThemeBuckets, type SrsTheme } from "@/lib/srs/srsThemes";

import { THEME_PICKER_COPY as copy } from "./profileCopy";

/**
 * A theme drawn as the two-tier ladder it actually is.
 *
 * Nine stages under five buckets, and the tiers are uneven on purpose:
 * Apprentice holds four rungs and Burned holds one, which is the shape of the
 * SRS itself — the early stages come back in hours and days, the last one
 * hardly comes back at all. A flat row of nine chips loses that entirely, and
 * it is the one thing a member needs to read off this card.
 *
 * So each bucket is its own box, and the boxes are sized by how many rungs
 * they hold: the four-rung tier is four times the width of the one-rung tier.
 * The level range is printed on each, because "Guru" means nothing until you
 * know it is stages 5 and 6.
 */
export default function ThemeLadder({ theme }: { theme: SrsTheme }) {
  const buckets = srsThemeBuckets(theme);
  /* Proportional tracks, so the tier holding four stages is visibly the wide
     one. `fr` over a fixed column count is what keeps it full width at every
     breakpoint without a media query per theme shape. */
  const columns = buckets.map((bucket) => `${bucket.levels.length}fr`).join(" ");

  return (
    <ol className="grid gap-2" style={{ gridTemplateColumns: columns }}>
      {buckets.map((bucket) => (
        <li key={bucket.bucket} className="min-w-0 rounded-xl border border-line bg-surface p-2">
          <p className="flex items-baseline justify-between gap-1">
            <span {...japaneseTextProps("truncate text-[11px] font-black text-foreground")}>{bucket.bucket}</span>
            <span className="shrink-0 text-[9px] font-black tabular-nums text-foreground/60">
              {copy.stageRange(bucket.levels)}
            </span>
          </p>
          <p className="truncate text-[9px] font-semibold text-foreground/60">{bucket.reading}</p>
          <ol className="mt-1.5 flex flex-wrap gap-1">
            {bucket.levels.map((level) => (
              <li
                key={level.level}
                title={`${copy.stage} ${level.level} · ${level.reading} — ${level.meaning}`}
                className={`min-w-0 rounded-lg px-1.5 py-1 ${srsStageTone(level.level)}`}
              >
                <span {...japaneseTextProps("block truncate text-sm font-black leading-tight")}>
                  {level.short}
                </span>
                <span className="block truncate text-[9px] font-semibold opacity-80">{level.reading}</span>
              </li>
            ))}
          </ol>
        </li>
      ))}
    </ol>
  );
}
