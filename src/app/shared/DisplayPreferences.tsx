"use client";

import { useState } from "react";

import { DISPLAY_PREFERENCES_COPY } from "./displayPreferencesCopy";

/**
 * How the site looks to you: the theme, and the face Japanese is set in.
 *
 * These lived in the account menu while the profile page held the rest of the
 * account, which was two homes for one idea - the thing the menu rebuild was
 * meant to end. They belong with the name and the visibility, because they are
 * the same kind of decision: how you want UmaKuma to be for you.
 *
 * Both are per-browser rather than per-account, stored locally and applied to
 * the document root. A member on a phone and a laptop can reasonably want
 * different answers, and neither needs a round trip to change.
 */

type ThemeMode = "light" | "dark";
type JpFontMode = "sans" | "serif";

const THEME_KEY = "wr:theme";
const JP_FONT_KEY = "wr:jp-font";

/**
 * What is actually in force: the root attribute first, then storage.
 *
 * The attribute is what the page is rendering with, so it is the honest
 * answer. Storage is the fallback for the moment before the theme script has
 * run, and private browsing may refuse it entirely.
 */
function readApplied<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
  attribute: string,
): T {
  if (typeof document === "undefined") return fallback;

  const applied = document.documentElement.getAttribute(attribute);
  if (allowed.includes(applied as T)) return applied as T;

  try {
    const raw = window.localStorage.getItem(key);
    return allowed.includes(raw as T) ? (raw as T) : fallback;
  } catch {
    return fallback;
  }
}

function store(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage errors in restricted browsing modes.
  }
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
   * Initialised from the document rather than from storage.
   *
   * The theme script sets these attributes on the root before paint, so the
   * document already holds the answer by the time this mounts - no effect, no
   * second render, and no flash of the wrong choice. Reading storage in an
   * initialiser would be wrong on the server; reading it in an effect would
   * set state synchronously and cascade.
   */
  const [theme, setTheme] = useState<ThemeMode>(() => readApplied(THEME_KEY, ["light", "dark"] as const, "light", "data-theme"));
  const [jpFont, setJpFont] = useState<JpFontMode>(() => readApplied(JP_FONT_KEY, ["sans", "serif"] as const, "sans", "data-jp-font"));

  function chooseTheme(next: ThemeMode) {
    setTheme(next);
    store(THEME_KEY, next);
    document.documentElement.setAttribute("data-theme", next);
  }

  function chooseJpFont(next: JpFontMode) {
    setJpFont(next);
    store(JP_FONT_KEY, next);
    document.documentElement.setAttribute("data-jp-font", next);
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
