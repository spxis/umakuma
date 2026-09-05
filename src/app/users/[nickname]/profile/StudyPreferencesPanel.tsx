"use client";

import { useState } from "react";

import { STUDY_REVIEW_ORDERS, STUDY_TEST_INTERVALS, type StudyPreferences } from "@/lib/srs/studyPreferences";

import { STUDY_PREFS_COPY as copy } from "./profileCopy";

const CHIP = "inline-flex h-8 items-center rounded-full border px-3 text-[11px] font-bold transition";
const ACTIVE = "border-accent bg-accent text-white";
const IDLE = "border-line bg-surface text-foreground/70 hover:bg-surface-muted";

/**
 * How this member wants to study.
 *
 * Everything here changes their experience or their pace. Nothing here changes
 * what a level means — the gate, the intervals and the JLPT majors are the
 * site's, identical for everybody, and `studyPreferences.ts` explains why at
 * length. The panel says so out loud, because a member offered choices is
 * entitled to know where the choices stop.
 */
export default function StudyPreferencesPanel({
  accountId,
  initial,
}: {
  accountId: string;
  initial: StudyPreferences;
}) {
  const [prefs, setPrefs] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(next: StudyPreferences) {
    setPrefs(next);
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/accounts/${accountId}/study-preferences`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(next),
      });
      const payload = (await response.json()) as { preferences?: StudyPreferences; error?: string };
      if (!response.ok) throw new Error(payload.error ?? copy.saveFailed);
      if (payload.preferences) setPrefs(payload.preferences);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  const row = (label: string, note: string, control: React.ReactNode) => (
    <div className="border-t border-line pt-3 first:border-0 first:pt-0">
      <p className="text-[12px] font-black text-foreground">{label}</p>
      <p className="mt-0.5 text-[11px] font-semibold leading-relaxed text-foreground/70">{note}</p>
      <div className="mt-2 flex flex-wrap gap-2">{control}</div>
    </div>
  );

  return (
    <section className="space-y-4 rounded-3xl border border-line bg-surface p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-black text-foreground">{copy.heading}</h2>
        <p className="mt-1 max-w-3xl text-sm font-semibold leading-relaxed text-foreground/70">{copy.blurb}</p>
      </div>

      <div className="space-y-3">
        {row(
          copy.reviewOrder.label,
          copy.reviewOrder.note,
          Object.values(STUDY_REVIEW_ORDERS).map((order) => (
            <button
              key={order}
              type="button"
              disabled={saving}
              onClick={() => save({ ...prefs, reviewOrder: order })}
              className={`${CHIP} ${prefs.reviewOrder === order ? ACTIVE : IDLE}`}
            >
              {copy.reviewOrder.options[order]}
            </button>
          )),
        )}

        {row(
          copy.testInterval.label,
          copy.testInterval.note,
          STUDY_TEST_INTERVALS.map((interval) => (
            <button
              key={interval}
              type="button"
              disabled={saving}
              onClick={() => save({ ...prefs, testInterval: interval })}
              className={`${CHIP} ${prefs.testInterval === interval ? ACTIVE : IDLE}`}
            >
              {copy.testInterval.options(interval)}
            </button>
          )),
        )}

        {row(
          copy.throttle.label,
          copy.throttle.note,
          (["site", "on", "off"] as const).map((choice) => (
            <button
              key={choice}
              type="button"
              disabled={saving}
              onClick={() => save({ ...prefs, throttleLessons: choice })}
              className={`${CHIP} ${prefs.throttleLessons === choice ? ACTIVE : IDLE}`}
            >
              {copy.throttle.options[choice]}
            </button>
          )),
        )}

        {row(
          copy.batchSize.label,
          copy.batchSize.note,
          [5, 10, 20, 30, 50].map((size) => (
            <button
              key={size}
              type="button"
              disabled={saving}
              onClick={() => save({ ...prefs, batchSize: size })}
              className={`${CHIP} ${prefs.batchSize === size ? ACTIVE : IDLE}`}
            >
              {size}
            </button>
          )),
        )}
      </div>

      {/* Where the choices stop, said plainly rather than discovered. */}
      <p className="rounded-2xl bg-surface-muted px-4 py-3 text-[11px] font-semibold leading-relaxed text-foreground/70">
        {copy.fixed}
      </p>

      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
    </section>
  );
}
