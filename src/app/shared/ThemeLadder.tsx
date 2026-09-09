"use client";

import { japaneseTextProps } from "./japaneseText";
import { srsStageLabelForStage } from "@/lib/srs/srsStageLabel";
import { srsStageTone } from "@/lib/srs/srsStageTone";
import { srsThemeBuckets, type SrsTheme } from "@/lib/srs/srsThemes";
import { themeLeadIsJapanese } from "./themeWords";
import { useThemeWords } from "./useThemeWords";

import { THEME_PICKER_COPY as copy } from "./themeCopy";

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
 *
 * Which script leads is the member's standing choice. In Japanese the second
 * line becomes the stage - `APPR - SRS 1` - because a rung has no stage column
 * to fall back on here, and 門下生 with nothing under it says where you are
 * only to someone who already knew.
 */
export default function ThemeLadder({ theme }: { theme: SrsTheme }) {
  const buckets = srsThemeBuckets(theme);
  const [mode] = useThemeWords();
  const japanese = themeLeadIsJapanese(mode);

  return (
    /* Proportional and wrapping, which is one rule rather than two. Five
       tracks sized `4fr 2fr 1fr 1fr 1fr` gave the four-rung tier its width on
       a laptop and squeezed the one-rung tiers to about forty pixels on a
       phone, where 関脇 came out as a letter and an ellipsis. Growing by rung
       count off a floor keeps the same proportions wherever there is room and
       drops the row to two lines where there is not. */
    <ol className="flex flex-wrap gap-2">
      {buckets.map((bucket) => (
        <li
          key={bucket.bucket}
          style={{ flex: `${bucket.levels.length} 1 8rem` }}
          className="min-w-0 rounded-xl border border-line bg-surface p-2"
        >
          <p className="flex items-baseline justify-between gap-1">
            {japanese ? (
              <span {...japaneseTextProps("truncate text-[11px] font-black text-foreground")}>{bucket.bucket}</span>
            ) : (
              <span className="truncate text-[11px] font-black text-foreground">{bucket.reading}</span>
            )}
            <span className="shrink-0 text-[9px] font-black tabular-nums text-foreground/60">
              {copy.stageRange(bucket.levels)}
            </span>
          </p>
          <p className="truncate text-[9px] font-semibold text-foreground/60">
            {japanese ? bucket.reading : (bucket.levels[0]?.bucketMeaning ?? bucket.reading)}
          </p>
          <ol className="mt-1.5 flex flex-wrap gap-1">
            {bucket.levels.map((level) => (
              <li
                key={level.level}
                title={`${copy.stage} ${level.level} · ${level.term} · ${level.reading} — ${level.meaning}`}
                className={`min-w-0 rounded-lg px-1.5 py-1 ${srsStageTone(level.level)}`}
              >
                {japanese ? (
                  <span {...japaneseTextProps("block truncate text-sm font-black leading-tight")}>{level.short}</span>
                ) : (
                  <span className="block truncate text-sm font-black leading-tight">{level.reading}</span>
                )}
                {/* One string and translation refused, the same as the Study
                    explorer's badge: the anchor is built by `srsStageLabel`,
                    not spelled out again here. */}
                <span className="block truncate text-[9px] font-semibold opacity-80">
                  {japanese ? srsStageLabelForStage(level.level) : level.meaning}
                </span>
              </li>
            ))}
          </ol>
        </li>
      ))}
    </ol>
  );
}
