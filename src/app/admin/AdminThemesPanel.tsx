"use client";

import { useMemo, useState } from "react";

import { japaneseTextProps } from "@/app/shared/japaneseText";
import { srsStageTone } from "@/lib/srs/srsStageTone";
import { srsThemeBuckets, srsThemes, type SrsTheme, type SrsThemeRating } from "@/lib/srs/srsThemes";

import AdminPanelHeader from "./AdminPanelHeader";
import {
  ADMIN_THEMES_COPY as copy,
  THEME_RATING_BADGE,
} from "./AdminThemes.constants";

const CHIP = "inline-flex h-7 items-center rounded-full border px-2.5 text-[11px] font-bold transition";
const ACTIVE = "border-accent bg-accent text-white";
const IDLE = "border-line bg-surface text-foreground/70 hover:bg-surface-muted";

/**
 * Every theme, with all ten of its stages on one line.
 *
 * The whole point of a theme is what it reads like from bottom to top, so the
 * browser shows the ladder rather than a name and a count: 白帯 through 紅帯,
 * 序ノ口 through 横綱. A rating is shown beside each because the set includes
 * organised crime and the sex trade, and a ten-year-old must never be offered
 * those — the picker filters on it, and this is where an admin checks the
 * filtering is right.
 */
export default function AdminThemesPanel() {
  const themes = srsThemes();
  const [search, setSearch] = useState("");
  const [rating, setRating] = useState<SrsThemeRating | null>(null);

  const found = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return themes.filter((theme) => {
      if (rating && theme.rating !== rating) return false;
      if (!needle) return true;
      if (theme.name.toLowerCase().includes(needle)) return true;
      if (theme.sourceName.toLowerCase().includes(needle)) return true;
      return theme.levels.some(
        (level) =>
          level.term.includes(search) ||
          level.reading.toLowerCase().includes(needle) ||
          level.meaning.toLowerCase().includes(needle),
      );
    });
  }, [themes, search, rating]);

  const rows = found.reduce((sum, theme) => sum + theme.levels.length, 0);

  return (
    <section className="rounded-2xl border border-line bg-surface/90 p-5 shadow-sm">
      <AdminPanelHeader label={copy.label} title={copy.title} description={copy.description} />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            if (search) setSearch("");
            else event.currentTarget.blur();
          }}
          placeholder={copy.search}
          className="h-8 min-w-[13rem] rounded-full border border-line bg-surface px-3 text-sm"
        />
        <button type="button" onClick={() => setRating(null)} className={`${CHIP} ${rating === null ? ACTIVE : IDLE}`}>
          {copy.allRatings}
        </button>
        {(["all", "teen", "adult"] as const).map((value) => (
          <button
            key={value}
            type="button"
            title={copy.ratingHint[value]}
            onClick={() => setRating(rating === value ? null : value)}
            className={`${CHIP} ${rating === value ? ACTIVE : IDLE}`}
          >
            {copy.ratings[value]} {themes.filter((theme) => theme.rating === value).length}
          </button>
        ))}
        <p className="text-[11px] font-semibold text-foreground/60">{copy.count(found.length, rows)}</p>
      </div>

      <ol className="mt-3 space-y-2">
        {found.map((theme) => (
          <ThemeRow key={theme.id} theme={theme} />
        ))}
      </ol>

      {found.length === 0 ? <p className="py-3 text-sm text-foreground/70">{copy.none}</p> : null}
    </section>
  );
}

function ThemeRow({ theme }: { theme: SrsTheme }) {
  return (
    <li className="rounded-xl border border-line bg-surface px-3 py-2.5">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h3 className="text-sm font-black text-foreground">{theme.name}</h3>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${THEME_RATING_BADGE[theme.rating]}`}>
          {copy.ratings[theme.rating]}
        </span>
        {theme.renamed ? (
          <span
            title={copy.renamedHint(theme.sourceName)}
            className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-700"
          >
            {copy.renamed}
          </span>
        ) : null}
      </div>

      <ol className="mt-2 flex flex-wrap items-start gap-3">
        {srsThemeBuckets(theme).map((group) => (
          <li key={`${group.bucket}-${group.levels[0].level}`}>
            {/* The bucket is the grouping the system itself uses — 級位 covers
                four belts, 範士 covers one — and a row of rungs without it
                loses the shape the theme was built around. */}
            <p className="mb-1 truncate text-[9px] font-black uppercase tracking-[0.06em] text-foreground/60">
              {group.bucket}
              {group.reading && group.reading !== group.bucket ? (
                <span className="ml-1 font-semibold normal-case tracking-normal opacity-80">{group.reading}</span>
              ) : null}
            </p>
            <ol className="flex flex-wrap gap-1.5">
              {group.levels.map((level) => (
                <li
                  key={level.level}
                  title={`${copy.stage} ${level.level} · ${level.reading} · ${level.meaning}`}
                  className={`rounded-lg px-2 py-1 ${srsStageTone(level.level)}`}
                >
                  <span className="block text-[9px] font-black tabular-nums opacity-60">{level.level}</span>
                  <span {...japaneseTextProps("block text-sm font-black leading-tight")}>{level.short}</span>
                  <span className="block text-[9px] font-semibold leading-tight opacity-70">{level.reading}</span>
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ol>
    </li>
  );
}
