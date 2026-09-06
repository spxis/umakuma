"use client";

import { useState } from "react";

import { AGE_BANDS, type AgeBand } from "@/lib/srs/ageBand";
import { srsThemeBuckets } from "@/lib/srs/srsThemes";

import { japaneseTextProps } from "./japaneseText";
import ModalShell from "./ModalShell";
import { MODAL_LAYERS } from "./modalLayers";
import ThemeLadder from "./ThemeLadder";
import ThemeQuestionnaire from "./ThemeQuestionnaire";
import { THEME_CHIP, THEME_PICKER_COPY as copy } from "./themeCopy";
import type { MemberThemeState } from "./useMemberTheme";

/**
 * Every theme we offer, over whatever the member was doing.
 *
 * Both surfaces that can change a theme open this one panel: the profile card
 * and the theme's own page. It used to be the profile page itself, ninety
 * cards deep, which is why the page had a scrolling box inside a card inside a
 * form — a browser wants the screen, and taking it back is one press.
 *
 * The age question is still first, and nothing else is drawn until it is
 * answered: it decides which themes exist for the account, so offering a grid
 * and then taking entries out of it is the wrong order.
 *
 * A click beside the panel closes it. Every choice in here saves the moment it
 * is made, so there is no typed input and no pending decision to discard — the
 * only thing a stray click costs is a search box the member can retype.
 */
export default function ThemeBrowserModal({
  state,
  onClose,
}: {
  state: MemberThemeState;
  onClose: () => void;
}) {
  const { theme, choices, ageBand, saving, error, save } = state;
  const [search, setSearch] = useState("");

  const needle = search.trim().toLowerCase();
  const shown = needle
    ? choices.filter(
        (entry) =>
          entry.name.toLowerCase().includes(needle) ||
          entry.levels.some((level) => level.reading.toLowerCase().includes(needle) || level.term.includes(search)),
      )
    : choices;

  return (
    <ModalShell
      onClose={onClose}
      layer={MODAL_LAYERS.page}
      label={copy.heading}
      height="list"
      gutter="sm"
      closeOnBackdrop
      panelClassName="mx-auto flex w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-xl"
    >
      <header className="flex items-start justify-between gap-3 border-b border-line bg-surface-muted px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-base font-black text-foreground">{copy.heading}</h2>
          <p className="mt-0.5 text-[12px] font-semibold leading-relaxed text-foreground/70">{copy.blurb}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-black text-foreground hover:text-accent"
        >
          {copy.close}
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
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

        {!ageBand ? null : (
          <>
            {/* What is on now, drawn as the two-tier ladder it is. */}
            <div className="rounded-2xl border border-line bg-surface-muted/40 p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">{copy.current}</p>
              <p className="mt-0.5 mb-2 text-sm font-black text-foreground">{theme.name}</p>
              <ThemeLadder theme={theme} />
            </div>

            {/* Five questions over the list, not instead of it: the whole
                browsable set stays below, in the order it has always been in. */}
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
                  /* First press empties it, second puts the panel away - and
                     the second is the shell's own Escape handler, so this one
                     only stops the press while there is a query to clear. */
                  if (!search) return;
                  event.stopPropagation();
                  setSearch("");
                }}
                placeholder={copy.search}
                className="h-9 w-full rounded-full border border-line bg-surface px-4 text-sm"
              />
              <p className="mt-1 text-[11px] font-semibold text-foreground/60">
                {copy.count(shown.length, choices.length)}
              </p>
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
                      className={`h-full w-full rounded-2xl border p-3 text-left transition ${
                        chosen ? "border-accent bg-accent/5" : "border-line bg-surface hover:bg-surface-muted"
                      }`}
                    >
                      <span className="block text-sm font-black text-foreground">{entry.name}</span>
                      {/* One rung per bucket, so a card previews the tiers
                          rather than four rungs that happen to sit at 1, 5, 7
                          and 9. */}
                      <span {...japaneseTextProps("mt-1 block text-[13px] font-semibold text-foreground/70")}>
                        {srsThemeBuckets(entry)
                          .map((bucket) => bucket.levels[0].short)
                          .join(" → ")}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </div>
    </ModalShell>
  );
}
