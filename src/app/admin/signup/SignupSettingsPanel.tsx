"use client";

import { useCallback, useEffect, useState } from "react";

import { ACCOUNT_VISIBILITY_DISPLAY, isAccountVisibility } from "@/lib/accountVisibility";
import {
  SIGNUP_MODES,
  SIGNUP_SETTING_DEFINITIONS,
  SIGNUP_SETTING_KEYS,
  type SignupSettings,
} from "@/lib/signupSettings";

import { SIGNUP_ADMIN_COPY } from "./Signup.constants";

/**
 * The signup settings, saved one at a time.
 *
 * Each change re-renders from the server's answer rather than optimistically,
 * for the same reason the feature flags do: believing the door is shut when it
 * is open is the failure that matters here.
 */
export default function SignupSettingsPanel() {
  const [settings, setSettings] = useState<SignupSettings | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/admin/signup-settings")
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        const body = (await response.json()) as { settings: SignupSettings };
        if (!cancelled) setSettings(body.settings);
      })
      .catch(() => {
        if (!cancelled) setError(SIGNUP_ADMIN_COPY.loadError);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback(async (key: string, value: string) => {
    setSavingKey(key);
    setError(null);
    try {
      const response = await fetch("/api/admin/signup-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (!response.ok) throw new Error(String(response.status));
      const body = (await response.json()) as { settings: SignupSettings };
      setSettings(body.settings);
    } catch {
      setError(SIGNUP_ADMIN_COPY.saveError);
    } finally {
      setSavingKey(null);
    }
  }, []);

  if (error && !settings) {
    return <p className="text-sm font-bold text-red-700">{error}</p>;
  }
  if (!settings) {
    // Distinguished from empty: there is always something to show here.
    return <p className="text-sm text-foreground/60">Loading...</p>;
  }

  const currentValue = (key: string): string => {
    if (key === SIGNUP_SETTING_KEYS.mode) return settings.mode;
    if (key === SIGNUP_SETTING_KEYS.defaultVisibility) return settings.defaultVisibility;
    if (key === SIGNUP_SETTING_KEYS.askVisibility) return String(settings.askVisibility);
    return String(settings.askDisplayName);
  };

  return (
    <div className="space-y-5">
      {error ? <p className="text-sm font-bold text-red-700">{error}</p> : null}

      {settings.mode === SIGNUP_MODES.inviteOnly ? (
        <p className="rounded-xl border border-line bg-surface-muted px-3 py-2 text-xs font-semibold text-foreground/70">
          {SIGNUP_ADMIN_COPY.closedNote}
        </p>
      ) : null}

      {SIGNUP_SETTING_DEFINITIONS.map((definition) => {
        const value = currentValue(definition.key);
        const saving = savingKey === definition.key;

        return (
          <fieldset key={definition.key} className={saving ? "opacity-60" : undefined}>
            <legend className="text-sm font-black text-foreground">{definition.label}</legend>
            <p className="mb-2 text-xs text-foreground/60">{definition.description}</p>

            {definition.kind === "toggle" ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => void save(definition.key, value === "true" ? "false" : "true")}
                className={`inline-flex h-9 items-center rounded-full border px-4 text-xs font-black uppercase tracking-[0.1em] transition ${
                  value === "true"
                    ? "border-accent bg-accent text-white"
                    : "border-line bg-surface text-foreground/70 hover:bg-surface-muted"
                }`}
              >
                {value === "true" ? "On" : "Off"}
              </button>
            ) : (
              <div className="space-y-2">
                {definition.options?.map((option) => {
                  /*
                   * The visibility setting reuses the member-facing wording, so
                   * the admin reads the same words the member will.
                   */
                  const label = isAccountVisibility(option.value)
                    ? ACCOUNT_VISIBILITY_DISPLAY[option.value].label
                    : option.label;
                  const description = isAccountVisibility(option.value)
                    ? ACCOUNT_VISIBILITY_DISPLAY[option.value].description
                    : option.description;

                  return (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${
                        value === option.value ? "border-accent bg-accent/5" : "border-line hover:bg-surface-muted"
                      }`}
                    >
                      <input
                        type="radio"
                        name={definition.key}
                        value={option.value}
                        checked={value === option.value}
                        disabled={saving}
                        onChange={() => void save(definition.key, option.value)}
                        className="mt-0.5"
                      />
                      <span>
                        <span className="block text-sm font-bold text-foreground">{label}</span>
                        {description ? (
                          <span className="block text-xs text-foreground/60">{description}</span>
                        ) : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </fieldset>
        );
      })}
    </div>
  );
}
