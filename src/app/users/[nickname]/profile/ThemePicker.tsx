"use client";

import { useState } from "react";

import { japaneseTextProps } from "@/app/shared/japaneseText";
import { AGE_BANDS, type AgeBand } from "@/lib/srs/ageBand";
import type { SrsTheme } from "@/lib/srs/srsThemes";

import { THEME_PICKER_COPY as copy } from "./profileCopy";

const CHIP = "inline-flex h-8 items-center rounded-full border px-3 text-[11px] font-bold transition";
const ACTIVE = "border-accent bg-accent text-white";
const IDLE = "border-line bg-surface text-foreground/70 hover:bg-surface-muted";

/**
 * What a member's stages are called.
 *
 * WaniKani's Apprentice, Guru, Master, Enlightened and Burned are the only
 * words its learners ever get. Here they are one choice among many — belts,
 * sumo ranks, the corporate ladder, ghosts — and a member can change at any
 * time, because the stored value never moves. Nothing in the database changes
 * when they switch; only the words do.
 *
 * The age band sits in the same card because it is what decides which themes
 * appear. It asks for a band, not a birthdate: the only thing the site needs
 * from age is whether to offer the handful about organised crime and the sex
 * trade, and a date of birth is more than that question is worth.
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

      {/* What is on now, drawn as the ladder it is. */}
      <div className="rounded-2xl border border-line bg-surface-muted/40 p-3">
        <p className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">{copy.current}</p>
        <p className="mt-0.5 text-sm font-black text-foreground">{theme.name}</p>
        <ol className="mt-2 flex flex-wrap gap-1.5">
          {theme.levels.slice(1).map((level) => (
            <li key={level.level} className="rounded-lg bg-surface px-2 py-1" title={`${level.reading} — ${level.meaning}`}>
              <span {...japaneseTextProps("block text-sm font-black leading-tight text-foreground")}>{level.short}</span>
              <span className="block text-[9px] font-semibold text-foreground/60">{level.reading}</span>
            </li>
          ))}
        </ol>
      </div>

      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">{copy.ageHeading}</p>
        <p className="mt-0.5 text-[13px] font-semibold text-foreground/70">{copy.ageBlurb}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(Object.values(AGE_BANDS) as AgeBand[]).map((band) => (
            <button
              key={band}
              type="button"
              disabled={saving}
              onClick={() => save({ ageBand: band })}
              className={`${CHIP} ${ageBand === band ? ACTIVE : IDLE}`}
            >
              {copy.ageBands[band]}
            </button>
          ))}
        </div>
      </div>

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

      <ol className="grid gap-2 sm:grid-cols-2">
        {shown.map((entry) => {
          const chosen = entry.id === theme.id;
          return (
            <li key={entry.id}>
              <button
                type="button"
                disabled={saving}
                onClick={() => save({ themeId: entry.id })}
                aria-pressed={chosen}
                className={`w-full rounded-2xl border p-3 text-left transition ${
                  chosen ? "border-accent bg-accent/5" : "border-line bg-surface hover:bg-surface-muted"
                }`}
              >
                <span className="block text-sm font-black text-foreground">{entry.name}</span>
                <span {...japaneseTextProps("mt-1 block text-[13px] font-semibold text-foreground/70")}>
                  {[1, 5, 7, 9].map((stage) => entry.levels[stage].short).join(" → ")}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
    </section>
  );
}
