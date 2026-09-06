"use client";

import Link from "next/link";

import ThemeBrowseButton from "@/app/shared/ThemeBrowseButton";
import ThemeLadder from "@/app/shared/ThemeLadder";
import { THEME_PAGE_COPY, THEME_PICKER_COPY as copy } from "@/app/shared/themeCopy";
import { useMemberTheme } from "@/app/shared/useMemberTheme";
import type { AgeBand } from "@/lib/srs/ageBand";
import type { SrsTheme } from "@/lib/srs/srsThemes";

/**
 * What a member's stages are called, on the page where they set everything else.
 *
 * The card used to *be* the browser: ninety cards, a five-question quiz and a
 * search box, all inside a settings page, in a box that scrolled. It says what
 * is on now and opens the browser in a modal instead, and the reading of the
 * theme itself — all ten rungs, with WaniKani's word beside each — lives on
 * the theme's own page, which this links to. One place to change it, one place
 * to read it, and the profile is a settings page again.
 */
export default function ThemePicker({
  accountId,
  themeHref,
  initialTheme,
  initialChoices,
  initialAgeBand,
}: {
  accountId: string;
  /** The member's own theme page. Absolute, because only the page knows the address. */
  themeHref: string;
  initialTheme: SrsTheme;
  initialChoices: SrsTheme[];
  initialAgeBand: AgeBand | null;
}) {
  const state = useMemberTheme({ accountId, initialTheme, initialChoices, initialAgeBand });

  return (
    <section className="space-y-4 rounded-3xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-black text-foreground">{copy.heading}</h2>
          <p className="mt-1 text-sm font-semibold leading-relaxed text-foreground/70">{copy.blurb}</p>
        </div>
        <ThemeBrowseButton state={state} className="shrink-0" />
      </div>

      {state.error ? <p className="text-sm font-semibold text-rose-600">{state.error}</p> : null}

      <div className="rounded-2xl border border-line bg-surface-muted/40 p-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-[11px] font-black uppercase tracking-[0.08em] text-foreground/60">{copy.current}</p>
          <Link href={themeHref} className="text-[11px] font-black text-accent hover:underline">
            {THEME_PAGE_COPY.readMore}
          </Link>
        </div>
        <p className="mt-0.5 mb-2 text-sm font-black text-foreground">{state.theme.name}</p>
        <ThemeLadder theme={state.theme} />
      </div>
    </section>
  );
}
