"use client";

import { useCallback, useEffect, useState } from "react";

import type { FeatureFlagState } from "@/lib/featureFlags";
import { formatRelativeFromNow } from "@/lib/timeFormat";

import { FEATURE_FLAGS_COPY } from "./FeatureFlags.constants";

/**
 * The toggle list. Each switch saves immediately and re-renders from the
 * server's answer, so what the page shows is what the database holds — an
 * optimistic flip that failed would leave the admin believing a door is shut
 * when it is open.
 */
export default function FeatureFlagsPanel() {
  const [flags, setFlags] = useState<FeatureFlagState[] | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/admin/feature-flags")
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        const body = (await response.json()) as { flags: FeatureFlagState[] };
        if (!cancelled) setFlags(body.flags);
      })
      .catch(() => {
        if (!cancelled) setError(FEATURE_FLAGS_COPY.loadError);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = useCallback(async (flag: FeatureFlagState) => {
    setSavingKey(flag.key);
    setError(null);
    try {
      const response = await fetch("/api/admin/feature-flags", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: flag.key, enabled: !flag.enabled }),
      });
      if (!response.ok) throw new Error(String(response.status));
      const body = (await response.json()) as { flags: FeatureFlagState[] };
      setFlags(body.flags);
    } catch {
      setError(FEATURE_FLAGS_COPY.saveError);
    } finally {
      setSavingKey(null);
    }
  }, []);

  if (error && !flags) {
    return <p className="py-6 text-sm font-semibold text-red-600">{error}</p>;
  }

  if (!flags) {
    return <p className="py-6 text-sm text-foreground/60">{FEATURE_FLAGS_COPY.saving}</p>;
  }

  if (flags.length === 0) {
    return <p className="py-6 text-sm text-foreground/60">{FEATURE_FLAGS_COPY.empty}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}

      {flags.map((flag) => {
        const saving = savingKey === flag.key;
        return (
          <div
            key={flag.key}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-black text-foreground">{flag.label}</span>
                <code className="rounded bg-surface-muted px-1.5 py-0.5 text-[11px] font-semibold text-foreground/60">
                  {flag.key}
                </code>
                {!flag.stored ? (
                  <span className="rounded-full border border-line bg-surface-muted px-2 py-0.5 text-[10px] font-black uppercase text-foreground/60">
                    {FEATURE_FLAGS_COPY.defaultNote}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-foreground/70">{flag.description}</p>
              {flag.updatedAt ? (
                <p className="mt-1 text-xs text-foreground/60">
                  Changed {formatRelativeFromNow(flag.updatedAt, { style: "short" })}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={flag.enabled}
              aria-label={`${flag.label}: ${flag.enabled ? FEATURE_FLAGS_COPY.onLabel : FEATURE_FLAGS_COPY.offLabel}`}
              disabled={saving}
              onClick={() => void toggle(flag)}
              className={`inline-flex h-9 w-24 shrink-0 items-center justify-center rounded-full border text-sm font-black uppercase tracking-wide transition disabled:cursor-wait disabled:opacity-60 ${
                flag.enabled
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-line bg-surface-muted text-foreground/60 hover:bg-surface"
              }`}
            >
              {saving
                ? FEATURE_FLAGS_COPY.saving
                : flag.enabled
                  ? FEATURE_FLAGS_COPY.onLabel
                  : FEATURE_FLAGS_COPY.offLabel}
            </button>
          </div>
        );
      })}
    </div>
  );
}
