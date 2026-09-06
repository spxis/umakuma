"use client";

import ThemeBrowseButton from "@/app/shared/ThemeBrowseButton";
import ThemeLadder from "@/app/shared/ThemeLadder";
import { japaneseTextProps } from "@/app/shared/japaneseText";
import { THEME_PAGE_COPY as copy } from "@/app/shared/themeCopy";
import { useMemberTheme } from "@/app/shared/useMemberTheme";
import { SRS_BUCKET_TITLE_LABELS } from "@/lib/domainConstants";
import type { AgeBand } from "@/lib/srs/ageBand";
import { SRS_STAGE_BUCKET, srsStageTone } from "@/lib/srs/srsStageTone";
import type { SrsTheme } from "@/lib/srs/srsThemes";

/**
 * The theme, read out rung by rung.
 *
 * All ten: the nine an item climbs, and the one it has not left. The profile
 * card shows the five tiers because that is the shape of the SRS; this shows
 * every stage inside them, because that is the question this page exists to
 * answer — what a review will actually call the thing in front of you.
 *
 * WaniKani's word sits in the last column. It is the only stage vocabulary a
 * member arriving from there already has, and without it a table of unfamiliar
 * names in an unfamiliar order is a list of words rather than a translation.
 *
 * Client-side because the browser opens from here and the page must redraw
 * under a switch: picking a theme in the modal changes this table behind it,
 * with no reload and nothing left saying the old name.
 */
export default function ThemeStagesPanel({
  accountId,
  initialTheme,
  initialChoices,
  initialAgeBand,
}: {
  accountId: string;
  initialTheme: SrsTheme;
  initialChoices: SrsTheme[];
  initialAgeBand: AgeBand | null;
}) {
  const state = useMemberTheme({ accountId, initialTheme, initialChoices, initialAgeBand });
  const theme = state.theme;

  return (
    <>
      <section className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-black text-foreground">{theme.name}</h2>
            <p className="mt-1 text-sm font-semibold leading-relaxed text-foreground/70">{copy.blurb}</p>
          </div>
          <ThemeBrowseButton state={state} className="shrink-0" />
        </div>

        {state.error ? <p className="mt-3 text-sm font-semibold text-rose-600">{state.error}</p> : null}

        <div className="mt-4">
          <p className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">{copy.tiers}</p>
          <p className="mb-2 mt-0.5 text-[13px] font-semibold text-foreground/70">{copy.tiersBlurb}</p>
          <ThemeLadder theme={theme} />
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
        <h2 className="text-lg font-black text-foreground">{copy.heading}</h2>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="text-left text-[10px] font-black uppercase tracking-[0.08em] text-foreground/60">
                <th className="pb-2">{copy.stage}</th>
                <th className="pb-2">{copy.term}</th>
                <th className="pb-2">{copy.meaning}</th>
                <th className="pb-2">{copy.tier}</th>
                <th className="pb-2">{copy.wanikani}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {theme.levels.map((level) => (
                <tr key={level.level}>
                  <td className="py-2 align-top">
                    <span
                      className={`inline-flex min-w-[2rem] justify-center rounded-lg px-2 py-1 text-xs font-black tabular-nums ${srsStageTone(level.level)}`}
                    >
                      {level.level}
                    </span>
                  </td>
                  <td className="py-2 align-top">
                    <span {...japaneseTextProps("block font-black text-foreground")}>{level.term}</span>
                    <span className="block text-[11px] font-semibold text-foreground/60">{level.reading}</span>
                  </td>
                  <td className="py-2 align-top font-semibold text-foreground/75">{level.meaning}</td>
                  <td className="py-2 align-top">
                    <span {...japaneseTextProps("block font-bold text-foreground/80")}>{level.bucket}</span>
                    <span className="block text-[11px] font-semibold text-foreground/60">{level.bucketMeaning}</span>
                  </td>
                  <td className="py-2 align-top text-xs font-semibold text-foreground/60">
                    {level.level === 0 ? copy.notStarted : SRS_BUCKET_TITLE_LABELS[SRS_STAGE_BUCKET[level.level]]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
