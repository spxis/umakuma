"use client";

import { useMemo, useState } from "react";

import {
  articleFontLabel,
  buildWkCapOptions,
  bumpTextSize,
  kanjiCapBasisLabel,
  kanjiCapLabel,
  NEWS_KANJI_CAP_BASIS_OPTIONS,
  NEWS_KANJI_CAP_GRADE_OPTIONS,
  NEWS_KANJI_CAP_JLPT_OPTIONS,
  textSizeLabel,
  type NewsArticleFont,
  type NewsKanjiCapBasis,
  type NewsKanjiCapGrade,
  type NewsKanjiCapJlpt,
  type NewsKanjiCapWk,
  type NewsReadingPrefs,
  type NewsTextSize,
} from "./newsReadingPrefs";

type Props = {
  prefs: NewsReadingPrefs;
  onChange: (next: NewsReadingPrefs) => void;
  userWkLevel?: number | null;
};

export default function NewsReadingControls({ prefs, onChange, userWkLevel = null }: Props) {
  const hasKnownWkLevel = typeof userWkLevel === "number" && Number.isFinite(userWkLevel);
  const normalizedWkLevel = hasKnownWkLevel
    ? Math.max(1, Math.min(60, Math.floor(userWkLevel)))
    : null;

  const allWkOptions = useMemo(() => buildWkCapOptions(normalizedWkLevel), [normalizedWkLevel]);
  const wkBaseOptions = useMemo(() => {
    if (normalizedWkLevel === null) {
      return allWkOptions;
    }

    return allWkOptions.filter((value) => value === "all" || Number(value) <= normalizedWkLevel);
  }, [allWkOptions, normalizedWkLevel]);
  const hasWkOverrideOptions = useMemo(() => {
    if (normalizedWkLevel === null) {
      return false;
    }

    return allWkOptions.some((value) => value !== "all" && Number(value) > normalizedWkLevel);
  }, [allWkOptions, normalizedWkLevel]);

  const selectedWkBeyondLevel =
    normalizedWkLevel !== null &&
    prefs.kanjiCapBasis === "wk" &&
    prefs.kanjiCapWk !== "all" &&
    Number(prefs.kanjiCapWk) > normalizedWkLevel;

  const [showWkOverrides, setShowWkOverrides] = useState(selectedWkBeyondLevel);
  const effectiveShowWkOverrides = showWkOverrides || selectedWkBeyondLevel;

  function setSize(size: NewsTextSize) {
    onChange({ ...prefs, textSize: size });
  }

  function toggleKanji() {
    onChange({ ...prefs, emphasizeKanji: !prefs.emphasizeKanji });
  }

  function setFont(font: NewsArticleFont) {
    onChange({ ...prefs, articleFont: font });
  }

  function setKanjiCapBasis(value: NewsKanjiCapBasis) {
    onChange({ ...prefs, kanjiCapBasis: value });
  }

  function setKanjiCapJlpt(value: NewsKanjiCapJlpt) {
    onChange({ ...prefs, kanjiCapJlpt: value });
  }

  function setKanjiCapWk(value: NewsKanjiCapWk) {
    onChange({ ...prefs, kanjiCapWk: value });
  }

  function setKanjiCapGrade(value: NewsKanjiCapGrade) {
    onChange({ ...prefs, kanjiCapGrade: value });
  }

  const capOptions =
    prefs.kanjiCapBasis === "jlpt"
      ? NEWS_KANJI_CAP_JLPT_OPTIONS
      : prefs.kanjiCapBasis === "wk"
        ? effectiveShowWkOverrides
          ? allWkOptions
          : wkBaseOptions
        : NEWS_KANJI_CAP_GRADE_OPTIONS;

  const activeCapValue =
    prefs.kanjiCapBasis === "jlpt"
      ? prefs.kanjiCapJlpt
      : prefs.kanjiCapBasis === "wk"
        ? prefs.kanjiCapWk
        : prefs.kanjiCapGrade;

  const setCapValue = (value: string) => {
    if (prefs.kanjiCapBasis === "jlpt") {
      setKanjiCapJlpt(value as NewsKanjiCapJlpt);
      return;
    }
    if (prefs.kanjiCapBasis === "wk") {
      setKanjiCapWk(value as NewsKanjiCapWk);
      return;
    }
    setKanjiCapGrade(value as NewsKanjiCapGrade);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line/80 bg-surface-muted px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/60">
            Text size
          </span>
          <div className="inline-flex items-center overflow-hidden rounded-full border border-line bg-surface">
            <button
              type="button"
              onClick={() => setSize(bumpTextSize(prefs.textSize, -1))}
              className="px-3 py-1 text-sm font-bold text-foreground/80 hover:bg-surface-muted"
              aria-label="Decrease text size"
            >
              A−
            </button>
            <span className="border-x border-line px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/70">
              {textSizeLabel(prefs.textSize)}
            </span>
            <button
              type="button"
              onClick={() => setSize(bumpTextSize(prefs.textSize, 1))}
              className="px-3 py-1 text-sm font-bold text-foreground/80 hover:bg-surface-muted"
              aria-label="Increase text size"
            >
              A+
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/60">
            Font
          </span>
          <div className="inline-flex items-center overflow-hidden rounded-full border border-line bg-surface">
            {(["body", "jp-sans", "jp-serif"] as const).map((font) => (
              <button
                key={font}
                type="button"
                onClick={() => setFont(font)}
                className={`px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] ${prefs.articleFont === font ? "bg-accent text-surface" : "text-foreground/75 hover:bg-surface-muted"}`}
                aria-label={`Use ${articleFontLabel(font)} font`}
              >
                {articleFontLabel(font)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-start gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/60">
            Kanji cap
          </span>
          <div className="inline-flex items-center overflow-hidden rounded-full border border-line bg-surface">
            {NEWS_KANJI_CAP_BASIS_OPTIONS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setKanjiCapBasis(value)}
                className={`px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] ${prefs.kanjiCapBasis === value ? "bg-accent text-surface" : "text-foreground/75 hover:bg-surface-muted"}`}
                aria-label={`Use ${kanjiCapBasisLabel(value)} cap basis`}
              >
                {kanjiCapBasisLabel(value)}
              </button>
            ))}
          </div>
          <div className="flex min-w-0 flex-1 flex-wrap items-start gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-1 rounded-2xl border border-line bg-surface p-1">
              {capOptions.map((value) => {
                const wkOverride =
                  prefs.kanjiCapBasis === "wk" &&
                  value !== "all" &&
                  normalizedWkLevel !== null &&
                  Number(value) > normalizedWkLevel;
                const isUserCurrentWkLevel =
                  prefs.kanjiCapBasis === "wk" &&
                  value !== "all" &&
                  normalizedWkLevel !== null &&
                  Number(value) === normalizedWkLevel;

                const buttonClass =
                  activeCapValue === value
                    ? "bg-accent text-surface"
                    : isUserCurrentWkLevel
                      ? "bg-accent/12 text-accent ring-1 ring-inset ring-accent/45"
                      : "text-foreground/75 hover:bg-surface-muted";

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setCapValue(value)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] ${buttonClass}`}
                    aria-label={`Use ${kanjiCapLabel(prefs.kanjiCapBasis, value)} kanji cap`}
                    title={
                      wkOverride
                        ? `${kanjiCapLabel(prefs.kanjiCapBasis, value)} (override past your current WK level)`
                        : isUserCurrentWkLevel
                          ? `${kanjiCapLabel(prefs.kanjiCapBasis, value)} (your current WK level)`
                          : undefined
                    }
                  >
                    {kanjiCapLabel(prefs.kanjiCapBasis, value)}
                  </button>
                );
              })}
            </div>

            {prefs.kanjiCapBasis === "wk" && normalizedWkLevel !== null && hasWkOverrideOptions ? (
              <button
                type="button"
                onClick={() => {
                  setShowWkOverrides((prev) => !prev);
                }}
                className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${effectiveShowWkOverrides ? "border-accent bg-accent text-surface" : "border-line bg-surface text-foreground/70 hover:border-accent hover:text-accent"}`}
                aria-label={effectiveShowWkOverrides ? "Hide WK override levels" : `Show WK override levels above ${normalizedWkLevel}`}
                title={effectiveShowWkOverrides ? "Hide levels above your current WK level" : `Show levels above your current WK level (${normalizedWkLevel})`}
              >
                {effectiveShowWkOverrides ? "Hide Extra" : `Past ${normalizedWkLevel}`}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-foreground/75">
        <input
          type="checkbox"
          checked={prefs.emphasizeKanji}
          onChange={toggleKanji}
          className="h-4 w-4 accent-accent"
        />
        Enlarge kanji
      </label>
    </div>
  );
}
