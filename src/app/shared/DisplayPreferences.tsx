"use client";

import { useState } from "react";

import {
  DEFAULT_JP_FONT,
  DEFAULT_THEME,
  DISPLAY_PREFERENCE_ATTRIBUTES,
  DISPLAY_PREFERENCE_COOKIES,
  JP_FONT_MODES,
  THEME_MODES,
  writeDisplayPreferenceCookie,
  type JpFontMode,
  type ThemeMode,
} from "@/lib/displayPreferenceCookie";

import { DISPLAY_PREFERENCES_COPY } from "./displayPreferencesCopy";

/**
 * How the site looks to you: the theme, and the face Japanese is set in.
 *
 * These lived in the account menu while the profile page held the rest of the
 * account, which was two homes for one idea - the thing the menu rebuild was
 * meant to end. They belong with the name and the visibility, because they are
 * the same kind of decision: how you want UmaKuma to be for you.
 *
 * Both are per-browser rather than per-account. A member on a phone and a
 * laptop can reasonably want different answers, and neither needs a round trip
 * to change.
 *
 * Kept in a cookie rather than `localStorage`, because they decide the first
 * paint of every page and only the server can act on them that early. They
 * were stored locally and applied here, on the one page that mounts this, so
 * choosing Dark applied to the profile and nowhere else.
 */

/**
 * What is actually in force: the attribute the server stamped on the root.
 *
 * That is what the page is drawing with, so it is the honest answer and it is
 * already correct on arrival - the cookie decided it before the HTML was
 * written.
 */
function readApplied<T extends string>(allowed: readonly T[], fallback: T, attribute: string): T {
  if (typeof document === "undefined") return fallback;
  const applied = document.documentElement.getAttribute(attribute);
  return allowed.includes(applied as T) ? (applied as T) : fallback;
}

const OPTION_CLASS =
  "inline-flex h-9 items-center rounded-full border px-4 text-xs font-black uppercase tracking-[0.08em] transition";

function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (next: T) => void;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-foreground/60">{label}</p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`${OPTION_CLASS} ${
              option.value === value
                ? "border-accent bg-accent text-white"
                : "border-line bg-surface text-foreground/70 hover:bg-surface-muted"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function DisplayPreferences({ className }: { className?: string }) {
  /*
   * Initialised from the document, which the server already drew correctly
   * from the cookie - no effect, no second render, no flash of the default.
   */
  const [theme, setTheme] = useState<ThemeMode>(() =>
    readApplied(THEME_MODES, DEFAULT_THEME, DISPLAY_PREFERENCE_ATTRIBUTES.theme),
  );
  const [jpFont, setJpFont] = useState<JpFontMode>(() =>
    readApplied(JP_FONT_MODES, DEFAULT_JP_FONT, DISPLAY_PREFERENCE_ATTRIBUTES.jpFont),
  );

  /* The attribute changes this page now; the cookie changes every page next. */
  function chooseTheme(next: ThemeMode) {
    setTheme(next);
    writeDisplayPreferenceCookie(DISPLAY_PREFERENCE_COOKIES.theme, next);
    document.documentElement.setAttribute(DISPLAY_PREFERENCE_ATTRIBUTES.theme, next);
  }

  function chooseJpFont(next: JpFontMode) {
    setJpFont(next);
    writeDisplayPreferenceCookie(DISPLAY_PREFERENCE_COOKIES.jpFont, next);
    document.documentElement.setAttribute(DISPLAY_PREFERENCE_ATTRIBUTES.jpFont, next);
  }

  return (
    <div className={`space-y-3 ${className ?? ""}`.trim()}>
      <Choice
        label={DISPLAY_PREFERENCES_COPY.theme}
        value={theme}
        options={[
          { value: "light", label: DISPLAY_PREFERENCES_COPY.themeLight },
          { value: "dark", label: DISPLAY_PREFERENCES_COPY.themeDark },
        ]}
        onChange={chooseTheme}
      />
      <Choice
        label={DISPLAY_PREFERENCES_COPY.jpFont}
        value={jpFont}
        options={[
          { value: "sans", label: DISPLAY_PREFERENCES_COPY.jpFontSans },
          { value: "serif", label: DISPLAY_PREFERENCES_COPY.jpFontSerif },
        ]}
        onChange={chooseJpFont}
      />
      <p className="text-xs text-foreground/60">{DISPLAY_PREFERENCES_COPY.hint}</p>
    </div>
  );
}
