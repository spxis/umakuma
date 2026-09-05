"use client";

import { useCallback, useEffect, useState } from "react";

import { useAdminFeedback } from "./AdminFeedbackProvider";
import { ADMIN_SRS_RULES_COPY as copy } from "./AdminSrsRules.constants";

type Rules = {
  throttleLessonsOnBacklog: boolean;
  backlogThreshold: number;
  leechRule: boolean;
  leechWrongThreshold: number;
  leechMinStage: number;
  ghostReviews: boolean;
};

const NUMBER_FIELD = "h-8 w-24 rounded-lg border border-line bg-surface px-2 text-sm tabular-nums";

/** Rules that have a switch but no implementation behind them yet. */
const UNBUILT = new Set<keyof Rules>(["ghostReviews"]);

/**
 * Changing how the scheduler scores, without a deploy.
 *
 * The mechanisms these switch on come from `docs/SRS_MECHANISMS.md`, which
 * says what WaniKani, Anki, SuperMemo, Duolingo, Bunpro and Skritter each do
 * about a struggling learner. That document is the argument; this is the
 * switchboard.
 *
 * A rule with no implementation still gets a switch, marked as such. The
 * alternative is a document listing mechanisms we do not have and a screen
 * that pretends the list is complete.
 */
export default function AdminSrsRulesPanel() {
  const { showToast } = useAdminFeedback();
  const [rules, setRules] = useState<Rules | null>(null);
  const [draft, setDraft] = useState<Rules | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/srs-rules");
    if (!response.ok) return;
    const payload = (await response.json()) as { rules: Rules };
    setRules(payload.rules);
    setDraft(payload.rules);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!draft) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/srs-rules", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      const payload = (await response.json()) as { rules?: Rules; error?: string };
      if (!response.ok) throw new Error(payload.error ?? copy.saveFailed);
      showToast({ tone: "success", message: copy.saved });
      await load();
    } catch (caught) {
      showToast({ tone: "error", message: caught instanceof Error ? caught.message : copy.saveFailed });
    } finally {
      setBusy(false);
    }
  }

  if (!rules || !draft) return <p className="text-sm font-semibold text-foreground/60">{copy.loading}</p>;

  const changed = JSON.stringify(rules) !== JSON.stringify(draft);
  const set = <K extends keyof Rules>(key: K, value: Rules[K]) =>
    setDraft((held) => (held ? { ...held, [key]: value } : held));

  const toggle = (key: "throttleLessonsOnBacklog" | "leechRule" | "ghostReviews") => (
    <li className="rounded-lg bg-surface-muted px-3 py-2">
      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={draft[key]}
          onChange={(event) => set(key, event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-line"
        />
        <span className="min-w-0">
          <span className="block text-[12px] font-black text-foreground">
            {copy.rules[key].label}
            {UNBUILT.has(key) ? (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800">
                {copy.notBuilt}
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 block text-[11px] font-semibold leading-relaxed text-foreground/70">
            {copy.rules[key].note}
          </span>
        </span>
      </label>
    </li>
  );

  const number = (key: "backlogThreshold" | "leechWrongThreshold" | "leechMinStage") => (
    <li className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-muted px-3 py-2">
      <label className="flex items-center gap-2">
        <input
          type="number"
          value={draft[key]}
          onChange={(event) => set(key, Number(event.target.value))}
          className={NUMBER_FIELD}
        />
        <span className="text-[12px] font-black text-foreground">{copy.rules[key].label}</span>
      </label>
      <span className="w-full text-[11px] font-semibold text-foreground/70">{copy.rules[key].note}</span>
    </li>
  );

  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <h3 className="text-sm font-black text-foreground">{copy.heading}</h3>
      <p className="mt-0.5 max-w-3xl text-[12px] font-semibold leading-relaxed text-foreground/70">{copy.blurb}</p>

      <ol className="mt-3 space-y-1.5">
        {toggle("throttleLessonsOnBacklog")}
        {number("backlogThreshold")}
        {toggle("leechRule")}
        {number("leechWrongThreshold")}
        {number("leechMinStage")}
        {toggle("ghostReviews")}
      </ol>

      <button
        type="button"
        disabled={!changed || busy}
        onClick={save}
        className="mt-3 rounded-full bg-accent px-4 py-1.5 text-[12px] font-black text-white disabled:opacity-30"
      >
        {copy.save}
      </button>
    </section>
  );
}
