"use client";

import { useState } from "react";

import { japaneseTextProps } from "@/app/shared/japaneseText";
import { AGE_BANDS, type AgeBand } from "@/lib/srs/ageBand";
import { srsThemeBuckets, type SrsTheme } from "@/lib/srs/srsThemes";

import ThemeLadder from "./ThemeLadder";
import ThemeQuestionnaire from "./ThemeQuestionnaire";

import { THEME_CHIP, THEME_PICKER_COPY as copy } from "./profileCopy";
/* Ninety themes is a page that never ends. The list scrolls inside the card,
   so the age question and the ladder on now stay on screen while browsing. */
const LIST_HEIGHT = "max-h-[26rem]";

/**
 * What a member's stages are called.
 *
 * WaniKani's Apprentice, Guru, Master, Enlightened and Burned are the only
 * words its learners ever get. Here they are one choice among many — belts,
 * sumo ranks, the corporate ladder, ghosts — and a member can change at any
 * time, because the stored value never moves. Nothing in the database changes
 * when they switch; only the words do.
 *
 * The age band is asked **first**, and nothing else is drawn until it is
 * answered. It is what decides which themes exist for this account, so
 * offering a grid and then taking themes out of it is the wrong order — a
 * member would pick one and watch it disappear. It asks for a band, not a
 * birthdate: the only thing the site needs from age is whether to offer the
 * handful about organised crime and the sex trade, and a date of birth is more
 * than that question is worth.
 */
export default function ThemePicker({
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
  const [theme, setTheme] = useState(initialTheme);
  const [choices, setChoices] = useState(initialChoices);
  const [ageBand, setAgeBand] = useState(initialAgeBand);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  async function save(next: { themeId?: string | null; ageBand?: AgeBand }) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/accounts/${accountId}/theme`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(next),
      });
      const payload = (await response.json()) as { theme: SrsTheme; choices: SrsTheme[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? copy.saveFailed);
      setTheme(payload.theme);
      setChoices(payload.choices);
      if (next.ageBand) setAgeBand(next.ageBand);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : copy.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  const needle = search.trim().toLowerCase();
  const shown = needle
    ? choices.filter(
        (entry) =>
          entry.name.toLowerCase().includes(needle) ||
          entry.levels.some((level) => level.reading.toLowerCase().includes(needle) || level.term.includes(search)),
      )
    : choices;

  return (
    <section className="space-y-4 rounded-3xl border border-line bg-surface p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-black text-foreground">{copy.heading}</h2>
        <p className="mt-1 text-sm font-semibold leading-relaxed text-foreground/70">{copy.blurb}</p>
      </div>

      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">
          {ageBand ? copy.ageHeading : copy.ageFirstHeading}
        </p>
        <p className="mt-0.5 text-[13px] font-semibold text-foreground/70">
          {ageBand ? copy.ageBlurb : copy.ageFirstBlurb}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(Object.values(AGE_BANDS) as AgeBand[]).map((band) => (
            <button
              key={band}
              type="button"
              disabled={saving}
              onClick={() => save({ ageBand: band })}
              className={`${THEME_CHIP.base} ${ageBand === band ? THEME_CHIP.active : THEME_CHIP.idle}`}
            >
              {copy.ageBands[band]}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}

      {/* Nothing below is drawn until the band is answered: it decides which
          themes exist, and a grid that loses entries after a click is worse
          than one that waits. */}
      {!ageBand ? null : (
        <>
      {/* What is on now, drawn as the two-tier ladder it is. */}
      <div className="rounded-2xl border border-line bg-surface-muted/40 p-3">
        <p className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">{copy.current}</p>
        <p className="mt-0.5 mb-2 text-sm font-black text-foreground">{theme.name}</p>
        <ThemeLadder theme={theme} />
      </div>

      {/* Five questions over the list, not instead of it: the whole browsable
          set stays below, in the order it has always been in. */}
      <ThemeQuestionnaire
        themes={choices}
        ageBand={ageBand}
        currentThemeId={theme.id}
        busy={saving}
        onPick={(themeId) => save({ themeId })}
      />

      <div>
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
          className="h-9 w-full rounded-full border border-line bg-surface px-4 text-sm"
        />
        <p className="mt-1 text-[11px] font-semibold text-foreground/60">{copy.count(shown.length, choices.length)}</p>
      </div>

      <ol className={`grid gap-2 overflow-y-auto ${LIST_HEIGHT} sm:grid-cols-2`}>
        {shown.map((entry) => {
          const chosen = entry.id === theme.id;
          return (
            <li key={entry.id}>
              <button
                type="button"
                disabled={saving}
                onClick={() => save({ themeId: entry.id })}
                aria-pressed={chosen}
                className={`h-full w-full rounded-2xl border p-3 text-left transition ${
                  chosen ? "border-accent bg-accent/5" : "border-line bg-surface hover:bg-surface-muted"
                }`}
              >
                <span className="block text-sm font-black text-foreground">{entry.name}</span>
                {/* One rung per bucket, so a card previews the tiers rather
                    than four rungs that happen to sit at 1, 5, 7 and 9. */}
                <span {...japaneseTextProps("mt-1 block text-[13px] font-semibold text-foreground/70")}>
                  {srsThemeBuckets(entry)
                    .map((bucket) => bucket.levels[0].short)
                    .join(" \u2192 ")}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
        </>
      )}
    </section>
  );
}
