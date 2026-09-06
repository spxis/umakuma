"use client";

import { useState } from "react";

import type { AgeBand } from "@/lib/srs/ageBand";
import type { SrsTheme } from "@/lib/srs/srsThemes";

import { THEME_PICKER_COPY as copy } from "./themeCopy";

export type MemberThemeState = {
  theme: SrsTheme;
  choices: SrsTheme[];
  ageBand: AgeBand | null;
  saving: boolean;
  error: string | null;
  save: (next: { themeId?: string | null; ageBand?: AgeBand }) => Promise<void>;
};

/**
 * A member's theme, and the one call that changes it.
 *
 * Two surfaces now offer the same switch — the profile card and the theme's
 * own page — and both open the same browser over it. The PATCH, the choices it
 * returns and the error it can fail with belong to none of them in particular,
 * so they live here rather than being written twice and drifting on the third.
 *
 * The band is saved through the same route as the theme, because setting it
 * can take a theme away as well as offer one: the response carries whatever
 * the account is left holding, and that is what the surfaces redraw from.
 */
export function useMemberTheme(input: {
  accountId: string;
  initialTheme: SrsTheme;
  initialChoices: SrsTheme[];
  initialAgeBand: AgeBand | null;
}): MemberThemeState {
  const [theme, setTheme] = useState(input.initialTheme);
  const [choices, setChoices] = useState(input.initialChoices);
  const [ageBand, setAgeBand] = useState(input.initialAgeBand);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(next: { themeId?: string | null; ageBand?: AgeBand }) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/accounts/${input.accountId}/theme`, {
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

  return { theme, choices, ageBand, saving, error, save };
}
